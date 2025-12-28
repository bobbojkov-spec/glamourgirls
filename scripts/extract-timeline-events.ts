/**
 * Extract all timeline events for a specific girl
 * Usage: npx tsx scripts/extract-timeline-events.ts [girlId]
 */

import pool from '../src/lib/db';

async function extractTimelineEvents(girlId: number) {
  console.log(`=== EXTRACTING ALL TIMELINE EVENTS FOR GIRL ${girlId} ===\n`);
  
  try {
    console.log('Fetching girl info...');
    // Get girl info
    const [girlRows] = await pool.execute(
      `SELECT id, nm, firstname, familiq, slug FROM girls WHERE id = ?`,
      [girlId]
    ) as any[];
    
    if (!girlRows || girlRows.length === 0) {
      console.log(`❌ Girl with ID ${girlId} not found`);
      await pool.end();
      return;
    }
    
    const girl = girlRows[0];
    console.log(`Girl: ${girl.nm} (ID: ${girl.id}, Slug: ${girl.slug})\n`);
    
    // Get all timeline events
    const [timelineRows] = await pool.execute(
      `SELECT id, girlid, shrttext as date, lngtext as event, ord 
       FROM girlinfos 
       WHERE girlid = ? 
       ORDER BY COALESCE(ord, 999999) ASC, id ASC`,
      [girlId]
    ) as any[];
    
    console.log(`Total timeline events found: ${timelineRows.length}\n`);
    console.log('=== ALL TIMELINE EVENTS ===\n');
    
    timelineRows.forEach((event: any, index: number) => {
      console.log(`Event #${index + 1}:`);
      console.log(`  ID: ${event.id}`);
      console.log(`  Ord: ${event.ord || 'NULL'}`);
      console.log(`  Date: "${event.date || '(empty)'}"`);
      const eventText = event.event || '(empty)';
      console.log(`  Event: "${eventText.substring(0, 100)}${eventText.length > 100 ? '...' : ''}"`);
      console.log('');
    });
    
    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Total events: ${timelineRows.length}`);
    const withOrd = timelineRows.filter((e: any) => e.ord !== null && e.ord !== undefined);
    const withoutOrd = timelineRows.filter((e: any) => e.ord === null || e.ord === undefined);
    console.log(`Events with ord: ${withOrd.length}`);
    console.log(`Events without ord: ${withoutOrd.length}`);
    
    // Check for duplicates
    const ordValues = timelineRows.map((e: any) => e.ord).filter((o: any) => o !== null && o !== undefined);
    const uniqueOrds = new Set(ordValues);
    if (ordValues.length !== uniqueOrds.size) {
      console.log(`⚠️  WARNING: Duplicate ord values found!`);
      const duplicates = ordValues.filter((ord, idx) => ordValues.indexOf(ord) !== idx);
      console.log(`   Duplicate ords: ${[...new Set(duplicates)].join(', ')}`);
    }
    
    // Check for gaps in ord sequence
    if (withOrd.length > 0) {
      const sortedOrds = [...withOrd].sort((a, b) => (a.ord || 0) - (b.ord || 0));
      const minOrd = sortedOrds[0]?.ord || 0;
      const maxOrd = sortedOrds[sortedOrds.length - 1]?.ord || 0;
      const expectedCount = maxOrd - minOrd + 1;
      if (expectedCount !== withOrd.length) {
        console.log(`⚠️  WARNING: Gaps in ord sequence!`);
        console.log(`   Ord range: ${minOrd} to ${maxOrd} (expected ${expectedCount} events, found ${withOrd.length})`);
      }
    }
    
  } catch (error: any) {
    console.error('Error extracting timeline events:', error);
  } finally {
    await pool.end();
  }
}

// Get girlId from command line or use default (559 for A'leshia Lee)
const girlId = process.argv[2] ? parseInt(process.argv[2]) : 559;
extractTimelineEvents(girlId).catch(console.error);

