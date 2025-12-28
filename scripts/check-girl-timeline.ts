/**
 * Check a specific girl's timeline by slug
 * Usage: npx tsx scripts/check-girl-timeline.ts aleshia-lee
 */

import pool from '@/lib/db';

async function checkGirlTimeline(slug: string) {
  try {
    // Find the girl by slug
    const [girlRows] = await pool.execute(
      `SELECT id, nm, firstname, familiq, slug FROM girls WHERE slug = ?`,
      [slug]
    ) as any[];

    if (!girlRows || girlRows.length === 0) {
      console.log(`❌ No girl found with slug: ${slug}`);
      return;
    }

    const girl = girlRows[0];
    console.log(`\n✅ Found girl:`);
    console.log(`   ID: ${girl.id}`);
    console.log(`   Name: ${girl.nm}`);
    console.log(`   First Name: ${girl.firstname}`);
    console.log(`   Last Name: ${girl.familiq}`);
    console.log(`   Slug: ${girl.slug}`);

    // Check timeline events
    const [timelineRows] = await pool.execute(
      `SELECT id, shrttext as date, lngtext as event, ord 
       FROM girlinfos 
       WHERE girlid = ? 
       ORDER BY ord ASC`,
      [girl.id]
    ) as any[];

    console.log(`\n📅 Timeline Events (${timelineRows.length} total):`);
    if (timelineRows.length === 0) {
      console.log(`   ⚠️  NO TIMELINE EVENTS FOUND!`);
    } else {
      timelineRows.forEach((event: any, index: number) => {
        console.log(`\n   Event #${index + 1} (ord: ${event.ord || 'N/A'}, id: ${event.id}):`);
        console.log(`   Date: "${event.date || '(empty)'}"`);
        console.log(`   Event: "${(event.event || '(empty)').substring(0, 100)}${event.event && event.event.length > 100 ? '...' : ''}"`);
      });
    }

    // Check if there are any timeline events in the database at all for this girl
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM girlinfos WHERE girlid = ?`,
      [girl.id]
    ) as any[];
    const totalCount = parseInt(countRows[0]?.count || '0');
    
    if (totalCount === 0) {
      console.log(`\n⚠️  WARNING: No timeline events exist in the database for this girl!`);
      console.log(`   This could mean:`);
      console.log(`   1. They were deleted during a save operation`);
      console.log(`   2. They were never created`);
      console.log(`   3. There was an error during insertion`);
    }

  } catch (error: any) {
    console.error('Error checking girl timeline:', error);
  } finally {
    await pool.end();
  }
}

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npx tsx scripts/check-girl-timeline.ts <slug>');
  process.exit(1);
}

checkGirlTimeline(slug);

