/**
 * Direct restore of 18 timeline events for girl 559
 * Uses the data from the user's console logs
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The 18 events from the user's console logs
const events = [
  { date: '', event: '(Alfred Brevard Crenshaw)', ord: 1 },
  { date: '9 December 37', event: 'is born in Erwin, Tennessee, to James and Mozelle Crenshaw', ord: 2 },
  { date: '?', event: 'attends East Tennessee State University', ord: 3 },
  { date: '59', event: 'starts in show business at Finocchio\'s in San Francisco, under the name of Lee Shaw', ord: 4 },
  { date: '?', event: 'studies acting', ord: 5 },
  { date: '?', event: 'is a showgirl at The Dunes in Las Vegas', ord: 6 },
  { date: '?', event: 'does a stint as a <i>Playboy</i> Bunny at Hollywood\'s Sunset Strip Hutch', ord: 7 },
  { date: '67', event: 'marries husband number one', ord: 8 },
  { date: 'June 68', event: 'divorces husband number one', ord: 9 },
  { date: '69', event: 'as A\'leshia Lee, she is cast for Universal Studio\'s <i>The Love God</i>, starring Don Knotts. The role is the result of Universal\'s year-long, exhaustive search for a statuesque, voluptuous red-haired actress to play the remaining Pussycat in the Knotts\' film. She signed with her first theatrical agent only the day previous to being sent on the all-important Universal audition. She is so new to the business that she has yet to have professional headshots taken. It almost costs her the role, since some studio executives are concerned how the tall red-head would photograph. Joe Rich, Universal\'s legendary casting director, vouches for her, and his support cinches the plum role for her.', ord: 10 },
  { date: '13 June 70', event: 'marries husband number two', ord: 11 },
  { date: '77', event: 'divorces husband number two', ord: 12 },
  { date: '81', event: 'marries husband number three', ord: 13 },
  { date: '84', event: 'divorces husband number three', ord: 14 },
  { date: '?', event: 'teaches theater at East Tennessee State University', ord: 15 },
  { date: '01', event: 'publishes her best selling autobiography "The Woman I Was Not Born To Be" at Temple University Press', ord: 16 },
  { date: '07', event: 'as Aleshia Brevard, she resides in California, maintaining her website, "aleshiabrevard.com"', ord: 17 },
  { date: '1 July 17', event: 'dies at age 79 at her home in Scotts Valley, California ', ord: 18 },
];

async function restore() {
  const girlId = 559;
  
  console.log('=== RESTORING 18 TIMELINE EVENTS ===\n');
  
  try {
    // Delete all existing events
    console.log('Deleting existing events...');
    const { error: deleteError } = await supabase
      .from('girlinfos')
      .delete()
      .eq('girlid', girlId);
    
    if (deleteError) {
      console.error('Error deleting:', deleteError);
      return;
    }
    console.log('✅ Deleted existing events\n');
    
    // Insert all 18 events
    console.log('Inserting 18 events...\n');
    const eventsToInsert = events.map(e => ({
      girlid: girlId,
      shrttext: e.date,
      lngtext: e.event,
      ord: e.ord,
    }));
    
    let inserted = 0;
    for (let i = 0; i < eventsToInsert.length; i++) {
      const { data, error } = await supabase
        .from('girlinfos')
        .insert(eventsToInsert[i])
        .select();
      
      if (error) {
        console.error(`❌ Event ${i + 1} failed:`, error);
      } else {
        console.log(`✅ Event ${i + 1}/18 (ord=${eventsToInsert[i].ord}) inserted (ID: ${data?.[0]?.id})`);
        inserted++;
      }
    }
    
    console.log(`\n✅ Restored ${inserted}/18 events`);
    
    // Verify
    const { data: verify, error: verifyError } = await supabase
      .from('girlinfos')
      .select('id, ord')
      .eq('girlid', girlId)
      .order('ord', { ascending: true });
    
    if (verifyError) {
      console.error('Verification error:', verifyError);
    } else {
      console.log(`\n✅ Verification: ${verify?.length || 0} events in database`);
    }
    
  } catch (error: any) {
    console.error('Error:', error);
  }
}

restore().catch(console.error);

