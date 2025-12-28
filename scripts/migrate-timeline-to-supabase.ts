/**
 * Migrate timeline events from local PostgreSQL to Supabase
 * 
 * This script:
 * 1. Reads all 18 timeline events from local PostgreSQL for girl 559
 * 2. Dumps the current single row in Supabase (id=120, ord=3)
 * 3. Inserts all 18 events into Supabase with normalized ord values (1-18)
 * 
 * Usage: npx tsx scripts/migrate-timeline-to-supabase.ts
 */

import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Local PostgreSQL connection
const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'glamourgirls',
  user: process.env.USER || 'borislavbojkov',
  password: '',
});

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
    // STEP 1: Read from local PostgreSQL
    console.log('STEP 1: Reading from local PostgreSQL...\n');
    
    const localResult = await localPool.query(
      `SELECT id, girlid, shrttext as date, lngtext as event, ord 
       FROM girlinfos 
       WHERE girlid = $1 
       ORDER BY COALESCE(ord, 999999) ASC, id ASC`,
      [girlId]
    );
    
    const localEvents = localResult.rows;
    console.log(`Found ${localEvents.length} events in local database\n`);
    
    if (localEvents.length === 0) {
      console.log('❌ No events found in local database');
      await localPool.end();
      return;
    }
    
    // Display all events
    console.log('=== ALL EVENTS FROM LOCAL DATABASE ===\n');
    localEvents.forEach((event, index) => {
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
      currentSupabaseEvents.forEach((event, index) => {
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
    
    // STEP 4: Insert all 18 events with normalized ord (1-18)
    console.log('=== STEP 4: Inserting all events into Supabase ===\n');
    
    const eventsToInsert = localEvents.map((event, index) => ({
      girlid: girlId,
      shrttext: event.date || '',
      lngtext: event.event || '',
      ord: index + 1, // Normalize to 1-18
    }));
    
    console.log(`Preparing to insert ${eventsToInsert.length} events with ord values 1-${eventsToInsert.length}...\n`);
    
    const { data: insertedEvents, error: insertError } = await supabase
      .from('girlinfos')
      .insert(eventsToInsert)
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting into Supabase:', insertError);
      await localPool.end();
      return;
    }
    
    console.log(`✅ Successfully inserted ${insertedEvents?.length || 0} events into Supabase\n`);
    
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
        verifyEvents.slice(0, 3).forEach((event, index) => {
          console.log(`  ${index + 1}. ord=${event.ord}, date="${event.shrttext || ''}", event="${(event.lngtext || '').substring(0, 40)}..."`);
        });
      }
    }
    
    console.log('\n✅ Migration complete!');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
  } finally {
    await localPool.end();
  }
}

migrateTimeline().catch(console.error);

