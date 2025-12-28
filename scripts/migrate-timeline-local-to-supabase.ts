/**
 * Migrate timeline events from local PostgreSQL to Supabase
 * 
 * This script:
 * 1. Reads all 18 timeline events from local PostgreSQL for girl 559
 * 2. Dumps the current single row in Supabase (id=120, ord=3)
 * 3. Inserts all 18 events into Supabase with normalized ord values (1-18)
 * 
 * Usage: npx tsx scripts/migrate-timeline-local-to-supabase.ts
 */

// Load .env.local file using dotenv
import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Create LOCAL PostgreSQL connection (not Supabase)
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'glamourgirls',
  user: process.env.USER || 'borislavbojkov',
  password: '',
});

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateTimeline() {
  const girlId = 559; // A'leshia Lee
  
  console.log('=== MIGRATING TIMELINE EVENTS TO SUPABASE ===\n');
  
  try {
    // STEP 1: Read from LOCAL PostgreSQL (localhost, not Supabase)
    console.log('STEP 1: Reading from LOCAL PostgreSQL (localhost)...\n');
    
    const localResult = await localPool.query(
      `SELECT id, girlid, shrttext as date, lngtext as event, ord 
       FROM girlinfos 
       WHERE girlid = $1 
       ORDER BY COALESCE(ord, 999999) ASC, id ASC`,
      [girlId]
    );
    
    const localEvents = localResult.rows;
    
    console.log(`Found ${Array.isArray(localEvents) ? localEvents.length : 0} events in local database\n`);
    
    if (!Array.isArray(localEvents) || localEvents.length === 0) {
      console.log('❌ No events found in local database');
      await localPool.end();
      return;
    }
    
    // Display all events
    console.log('=== ALL EVENTS FROM LOCAL DATABASE ===\n');
    localEvents.forEach((event: any, index: number) => {
      console.log(`Event #${index + 1}:`);
      console.log(`  Local ID: ${event.id}`);
      console.log(`  Ord: ${event.ord || 'NULL'}`);
      console.log(`  Date: "${event.date || '(empty)'}"`);
      console.log(`  Event: "${(event.event || '(empty)').substring(0, 60)}${(event.event || '').length > 60 ? '...' : ''}"`);
      console.log('');
    });
    
    // STEP 2: Dump current Supabase state
    console.log('\n=== STEP 2: Dumping current Supabase state ===\n');
    
    const { data: currentSupabaseEvents, error: fetchError } = await supabase
      .from('girlinfos')
      .select('*')
      .eq('girlid', girlId);
    
    if (fetchError) {
      console.error('Error fetching from Supabase:', fetchError);
      await localPool.end();
      return;
    }
    
    console.log(`Current events in Supabase: ${currentSupabaseEvents?.length || 0}\n`);
    
    if (currentSupabaseEvents && currentSupabaseEvents.length > 0) {
      console.log('=== CURRENT SUPABASE EVENTS (TO BE REPLACED) ===\n');
      currentSupabaseEvents.forEach((event: any, index: number) => {
        console.log(`Event #${index + 1}:`);
        console.log(`  Supabase ID: ${event.id}`);
        console.log(`  Ord: ${event.ord || 'NULL'}`);
        console.log(`  Date: "${event.shrttext || '(empty)'}"`);
        console.log(`  Event: "${(event.lngtext || '(empty)').substring(0, 60)}${(event.lngtext || '').length > 60 ? '...' : ''}"`);
        console.log('');
      });
      
      // Save dump to file
      const dumpFile = path.join(process.cwd(), 'scripts', 'supabase-timeline-dump.json');
      fs.writeFileSync(dumpFile, JSON.stringify(currentSupabaseEvents, null, 2));
      console.log(`✅ Dumped current Supabase state to: ${dumpFile}\n`);
    }
    
    // STEP 3: Delete existing events in Supabase
    console.log('=== STEP 3: Deleting existing events in Supabase ===\n');
    
    // First, check what IDs exist that might conflict
    const { data: allExisting, error: checkError } = await supabase
      .from('girlinfos')
      .select('id, girlid, ord')
      .eq('girlid', girlId);
    
    if (!checkError && allExisting && allExisting.length > 0) {
      console.log(`Found ${allExisting.length} existing events with IDs:`, allExisting.map((e: any) => e.id).join(', '));
    }
    
    // Delete all events for this girl
    const { error: deleteError } = await supabase
      .from('girlinfos')
      .delete()
      .eq('girlid', girlId);
    
    if (deleteError) {
      console.error('Error deleting from Supabase:', deleteError);
      await localPool.end();
      return;
    }
    
    console.log(`✅ Deleted ${currentSupabaseEvents?.length || 0} existing events\n`);
    
    // Also check if there are any other rows that might have conflicting IDs (1-12)
    // This shouldn't happen, but let's verify
    const { data: conflictingRows, error: conflictCheckError } = await supabase
      .from('girlinfos')
      .select('id, girlid')
      .in('id', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      .limit(20);
    
    if (!conflictCheckError && conflictingRows && conflictingRows.length > 0) {
      console.log(`⚠️  WARNING: Found ${conflictingRows.length} rows with IDs 1-12 that might conflict:`);
      conflictingRows.forEach((row: any) => {
        console.log(`   ID ${row.id} belongs to girl ${row.girlid}`);
      });
      console.log('   These rows are blocking insertion. Consider deleting them or using UPSERT.\n');
    }
    
    // Wait a moment to ensure deletion is complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // STEP 4: Insert all 18 events with normalized ord (1-18)
    console.log('=== STEP 4: Inserting all events into Supabase ===\n');
    
    // Create events WITHOUT id field - Supabase will auto-generate
    const eventsToInsert = localEvents.map((event: any, index: number) => {
      // Explicitly create object without id field
      return {
        girlid: girlId,
        shrttext: event.date || '',
        lngtext: event.event || '',
        ord: index + 1, // Normalize to 1-18
      };
    });
    
    console.log(`Preparing to insert ${eventsToInsert.length} events with ord values 1-${eventsToInsert.length}...\n`);
    console.log('Sample event to insert (checking for id field):');
    console.log(JSON.stringify(eventsToInsert[0], null, 2));
    console.log('Has id field?', 'id' in eventsToInsert[0] ? 'YES ❌' : 'NO ✅');
    console.log('');
    
    // Insert one at a time to avoid sequence conflicts
    // This is slower but more reliable when dealing with ID conflicts
    let insertedCount = 0;
    let failedCount = 0;
    
    console.log('Inserting events one at a time to avoid ID conflicts...\n');
    
    for (let i = 0; i < eventsToInsert.length; i++) {
      const event = eventsToInsert[i];
      
      // Explicitly create clean object with no id field
      const cleanEvent: any = {
        girlid: event.girlid,
        shrttext: event.shrttext,
        lngtext: event.lngtext,
        ord: event.ord,
      };
      
      // Try INSERT first
      let { data: insertedData, error: insertError } = await supabase
        .from('girlinfos')
        .insert(cleanEvent)
        .select();
      
      if (insertError && insertError.code === '23505') {
        // Duplicate key error - the ID that Supabase tried to use already exists
        // This means the sequence is out of sync. Let's find what row has that ID
        const errorDetails = (insertError as any).details || '';
        const idMatch = errorDetails.match(/Key \(id\)=\((\d+)\)/);
        const conflictingId = idMatch ? parseInt(idMatch[1]) : null;
        
        if (conflictingId) {
          console.log(`  ⚠️  Event ${i + 1} (ord=${event.ord}) - ID ${conflictingId} already exists`);
          
          // Check if that ID belongs to this girl
          const { data: conflictingRow } = await supabase
            .from('girlinfos')
            .select('id, girlid, ord')
            .eq('id', conflictingId)
            .single();
          
          if (conflictingRow && conflictingRow.girlid === girlId) {
            // It's for this girl - update it
            console.log(`     Updating existing row with ID ${conflictingId}...`);
            const { error: updateError } = await supabase
              .from('girlinfos')
              .update(cleanEvent)
              .eq('id', conflictingId);
            
            if (updateError) {
              console.error(`  ❌ Event ${i + 1} (ord=${event.ord}) failed to update:`, updateError.message);
              failedCount++;
            } else {
              console.log(`  ✅ Event ${i + 1}/${eventsToInsert.length} (ord=${event.ord}) updated successfully (ID: ${conflictingId})`);
              insertedCount++;
            }
          } else {
            // ID belongs to another girl - we need to work around the sequence
            // Try inserting with a very high temporary ord, then update it
            console.log(`     ID ${conflictingId} belongs to another girl. Using workaround...`);
            
            // Insert with a temporary high ord value to get a new ID
            const tempEvent = { ...cleanEvent, ord: 99999 };
            const { data: tempInsert, error: tempError } = await supabase
              .from('girlinfos')
              .insert(tempEvent)
              .select();
            
            if (tempError) {
              console.error(`  ❌ Event ${i + 1} (ord=${event.ord}) workaround failed:`, tempError.message);
              failedCount++;
            } else {
              // Now update it with the correct ord
              const newId = tempInsert?.[0]?.id;
              const { error: fixError } = await supabase
                .from('girlinfos')
                .update({ ord: cleanEvent.ord })
                .eq('id', newId);
              
              if (fixError) {
                console.error(`  ❌ Event ${i + 1} (ord=${event.ord}) failed to fix ord:`, fixError.message);
                failedCount++;
              } else {
                console.log(`  ✅ Event ${i + 1}/${eventsToInsert.length} (ord=${event.ord}) inserted with workaround (ID: ${newId})`);
                insertedCount++;
              }
            }
          }
        } else {
          console.error(`  ❌ Event ${i + 1} (ord=${event.ord}) failed:`, insertError.message);
          failedCount++;
        }
      } else if (insertError) {
        console.error(`  ❌ Event ${i + 1} (ord=${event.ord}) failed:`, insertError.message);
        failedCount++;
      } else {
        const insertedId = insertedData?.[0]?.id;
        console.log(`  ✅ Event ${i + 1}/${eventsToInsert.length} (ord=${event.ord}) inserted successfully (ID: ${insertedId})`);
        insertedCount++;
      }
      
      // Small delay to avoid overwhelming the database
      if (i < eventsToInsert.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\nInsertion summary: ${insertedCount} succeeded, ${failedCount} failed`);
    
    console.log(`\n✅ Successfully inserted ${insertedCount} events into Supabase\n`);
    
    // STEP 5: Verify
    console.log('=== STEP 5: Verification ===\n');
    
    const { data: verifyEvents, error: verifyError } = await supabase
      .from('girlinfos')
      .select('id, girlid, shrttext, lngtext, ord')
      .eq('girlid', girlId)
      .order('ord', { ascending: true });
    
    if (verifyError) {
      console.error('Error verifying:', verifyError);
    } else {
      console.log(`✅ Verification: ${verifyEvents?.length || 0} events now in Supabase\n`);
      
      if (verifyEvents && verifyEvents.length > 0) {
        console.log('First 3 events:');
        verifyEvents.slice(0, 3).forEach((event: any, index: number) => {
          console.log(`  ${index + 1}. ord=${event.ord}, date="${event.shrttext || ''}", event="${(event.lngtext || '').substring(0, 40)}..."`);
        });
        if (verifyEvents.length > 3) {
          console.log(`  ... and ${verifyEvents.length - 3} more events`);
        }
      }
    }
    
    console.log('\n✅ Migration complete!');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await localPool.end();
  }
}

// Run migration with proper error handling
migrateTimeline()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed with error:');
    console.error(error);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  });

