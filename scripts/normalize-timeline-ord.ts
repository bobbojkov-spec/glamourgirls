/**
 * One-time migration script to normalize timeline ord values
 * 
 * This script:
 * 1. Finds all timeline rows (girlinfos) where ord IS NULL
 * 2. Assigns sequential ord values based on existing order (id or date)
 * 3. Ensures every timeline row has a non-null integer ord
 * 
 * Run with: npx tsx scripts/normalize-timeline-ord.ts
 */

import pool from '../src/lib/db';

async function normalizeTimelineOrd() {
  console.log('🔄 Starting timeline ord normalization...\n');

  try {
    // Step 1: Find all girls with timeline events
    const [girlRows] = await pool.execute(
      `SELECT DISTINCT girlid FROM girlinfos ORDER BY girlid ASC`
    ) as any[];

    console.log(`Found ${girlRows.length} girls with timeline events\n`);

    let totalFixed = 0;
    let totalProcessed = 0;

    for (const girlRow of girlRows) {
      const girlId = girlRow.girlid;

      // Get all timeline events for this girl, ordered by id (insertion order) or date if available
      const [timelineRows] = await pool.execute(
        `SELECT id, shrttext as date, lngtext as event, ord 
         FROM girlinfos 
         WHERE girlid = ? 
         ORDER BY 
           CASE WHEN ord IS NOT NULL THEN 0 ELSE 1 END,
           ord ASC NULLS LAST,
           id ASC`,
        [girlId]
      ) as any[];

      if (!Array.isArray(timelineRows) || timelineRows.length === 0) {
        continue;
      }

      totalProcessed += timelineRows.length;

      // Check if any rows need fixing
      const needsFixing = timelineRows.some((row: any) => row.ord === null || row.ord === undefined);
      
      if (!needsFixing) {
        // All rows already have ord, but verify they're sequential
        const ordValues = timelineRows.map((r: any) => Number(r.ord)).filter((o: number) => !isNaN(o));
        const maxOrd = Math.max(...ordValues, 0);
        const minOrd = Math.min(...ordValues, 0);
        
        // If ord values are not sequential (1...N), normalize them
        if (maxOrd !== timelineRows.length || minOrd !== 1 || new Set(ordValues).size !== ordValues.length) {
          console.log(`  Girl ${girlId}: Normalizing non-sequential ord values (${ordValues.length} events)`);
          
          for (let i = 0; i < timelineRows.length; i++) {
            const newOrd = i + 1;
            const currentOrd = Number(timelineRows[i].ord);
            
            if (currentOrd !== newOrd) {
              await pool.execute(
                `UPDATE girlinfos SET ord = ? WHERE id = ?`,
                [newOrd, timelineRows[i].id]
              );
              totalFixed++;
            }
          }
        }
        continue;
      }

      console.log(`  Girl ${girlId}: Processing ${timelineRows.length} timeline events...`);

      // Separate rows with ord and without ord
      const rowsWithOrd = timelineRows.filter((r: any) => r.ord !== null && r.ord !== undefined);
      const rowsWithoutOrd = timelineRows.filter((r: any) => r.ord === null || r.ord === undefined);

      console.log(`    - ${rowsWithOrd.length} events with ord`);
      console.log(`    - ${rowsWithoutOrd.length} events without ord`);

      // Get the maximum existing ord value
      const maxExistingOrd = rowsWithOrd.length > 0
        ? Math.max(...rowsWithOrd.map((r: any) => Number(r.ord)).filter((o: number) => !isNaN(o)))
        : 0;

      // Assign ord values to rows without ord, starting after maxExistingOrd
      let nextOrd = maxExistingOrd + 1;
      for (const row of rowsWithoutOrd) {
        await pool.execute(
          `UPDATE girlinfos SET ord = ? WHERE id = ?`,
          [nextOrd, row.id]
        );
        totalFixed++;
        nextOrd++;
      }

      // Now normalize all ord values to be sequential (1...N)
      // Re-fetch to get updated ord values
      const [updatedRows] = await pool.execute(
        `SELECT id, ord FROM girlinfos WHERE girlid = ? ORDER BY ord ASC, id ASC`,
        [girlId]
      ) as any[];

      // Normalize to sequential 1...N
      for (let i = 0; i < updatedRows.length; i++) {
        const expectedOrd = i + 1;
        const currentOrd = Number(updatedRows[i].ord);
        
        if (currentOrd !== expectedOrd) {
          await pool.execute(
            `UPDATE girlinfos SET ord = ? WHERE id = ?`,
            [expectedOrd, updatedRows[i].id]
          );
          // Don't count this as a "fix" since we already counted the NULL fixes
        }
      }

      console.log(`    ✅ Fixed and normalized ${rowsWithoutOrd.length} events for girl ${girlId}\n`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   - Total events processed: ${totalProcessed}`);
    console.log(`   - Total events fixed: ${totalFixed}`);

    // Verify: Check for any remaining NULL ord values
    const [nullCheck] = await pool.execute(
      `SELECT COUNT(*) as count FROM girlinfos WHERE ord IS NULL`
    ) as any[];

    const nullCount = Number(nullCheck[0]?.count || 0);
    if (nullCount > 0) {
      console.error(`\n⚠️  WARNING: ${nullCount} timeline events still have NULL ord values!`);
    } else {
      console.log(`\n✅ Verification: All timeline events now have ord values`);
    }

  } catch (error: any) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
normalizeTimelineOrd().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

