/**
 * Restore all 18 timeline events for girl 559 (A'leshia Lee)
 * 
 * This script restores the original 18 timeline events from the local database
 * Usage: npx tsx scripts/restore-timeline-18-events.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

// Create LOCAL PostgreSQL connection (not Supabase)
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

async function restoreTimeline() {
  const girlId = 559; // A'leshia Lee

  console.log('=== RESTORING 18 TIMELINE EVENTS TO SUPABASE ===\n');

  try {
    // STEP 1: Read from local PostgreSQL
    console.log('STEP 1: Reading from local PostgreSQL...\n');

    const localEventsResult = await localPool.query(
      `SELECT id, girlid, shrttext as date, lngtext as event, ord
       FROM girlinfos
       WHERE girlid = $1
       ORDER BY COALESCE(ord, 999999) ASC, id ASC`,
      [girlId]
    );
    const localEvents = localEventsResult.rows;

    console.log(`Found ${localEvents.length} events in local database\n`);

    if (localEvents.length === 0) {
      console.log('❌ No events found in local database');
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

    // STEP 2: Delete all existing events in Supabase for this girl
    console.log('=== STEP 2: Deleting existing events in Supabase ===\n');

    const { data: currentSupabaseEvents, error: fetchError } = await supabase
      .from('girlinfos')
      .select('id')
      .eq('girlid', girlId);

    if (fetchError) {
      console.error('Error fetching current Supabase state:', fetchError);
      return;
    }

    console.log(`Current events in Supabase: ${currentSupabaseEvents?.length || 0}\n`);

    const { error: deleteError } = await supabase
      .from('girlinfos')
      .delete()
      .eq('girlid', girlId);

    if (deleteError) {
      console.error('Error deleting from Supabase:', deleteError);
      return;
    }

    console.log(`✅ Deleted ${currentSupabaseEvents?.length || 0} existing events\n`);

    // STEP 3: Insert all 18 events into Supabase
    console.log('=== STEP 3: Inserting all 18 events into Supabase ===\n');

    const eventsToInsert = localEvents.map((event: any, index: number) => ({
      girlid: girlId,
      shrttext: event.date || '',
      lngtext: event.event || '',
      ord: index + 1, // Normalize to 1-18
    }));

    console.log(`Preparing to insert ${eventsToInsert.length} events with ord values 1-${eventsToInsert.length}...\n`);

    let insertedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < eventsToInsert.length; i++) {
      const event = eventsToInsert[i];
      const { data: insertedEvent, error: insertError } = await supabase
        .from('girlinfos')
        .insert(event)
        .select();

      if (insertError) {
        console.error(`  ❌ Event ${i + 1} (ord=${event.ord}) failed:`, insertError);
        failedCount++;
      } else {
        console.log(`  ✅ Event ${i + 1}/${eventsToInsert.length} (ord=${event.ord}) inserted successfully (ID: ${insertedEvent?.[0]?.id})`);
        insertedCount++;
      }
    }

    console.log(`\nInsertion summary: ${insertedCount} succeeded, ${failedCount} failed\n`);

    // STEP 4: Verify
    console.log('=== STEP 4: Verification ===\n');

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
          console.log(`  ${index + 1}. ord=${event.ord}, date="${event.shrttext}", event="${(event.lngtext || '').substring(0, 40)}..."`);
        });
        if (verifyEvents.length > 3) {
          console.log(`  ... and ${verifyEvents.length - 3} more events`);
        }
      }
    }

    console.log('\n✅ Restoration complete!');

  } catch (error: any) {
    console.error('\n❌ An unexpected error occurred during restoration:', error);
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

restoreTimeline().catch(console.error);

