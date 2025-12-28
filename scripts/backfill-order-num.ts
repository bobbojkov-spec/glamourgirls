#!/usr/bin/env tsx

/**
 * Standalone script to backfill order_num for all gallery images
 * 
 * Usage: tsx scripts/backfill-order-num.ts
 * 
 * This script directly connects to the database and sets order_num
 * for all gallery images (mytp = 4) that have NULL or 0 order_num.
 */

import { getPool } from '../src/lib/db';

async function backfillOrderNum() {
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    console.log('🔍 Checking if order_num column exists...\n');

    // Check if order_num column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images' AND column_name = 'order_num'
    `);
    const hasOrderNum = columnCheck.rows.length > 0;

    if (!hasOrderNum) {
      console.error('❌ ERROR: order_num column does not exist. Please add the column first.');
      process.exit(1);
    }

    console.log('✅ order_num column exists\n');

    await client.query('BEGIN');

    // Get all distinct girlids that have gallery images (mytp = 4)
    const girlsResult = await client.query(`
      SELECT DISTINCT girlid 
      FROM images 
      WHERE mytp = 4
      ORDER BY girlid ASC
    `);

    const girlIds = girlsResult.rows.map((row: any) => Number(row.girlid));
    console.log(`📊 Processing ${girlIds.length} girls with gallery images\n`);

    let totalProcessed = 0;
    let totalUpdated = 0;
    const errors: Array<{ girlId: number; error: string }> = [];

    // Process each girl separately
    for (const girlId of girlIds) {
      try {
        // Get all gallery images for this girl, ordered by id ASC (stable ordering)
        // Note: created_at column may not exist, so we use id which is always available
        const imagesResult = await client.query(`
          SELECT id, order_num
          FROM images
          WHERE girlid = $1 AND mytp = 4
          ORDER BY id ASC
        `, [girlId]);

        const images = imagesResult.rows;
        const imageCount = images.length;

        if (imageCount === 0) {
          continue; // Skip girls with no gallery images
        }

        // Count how many need updating (NULL or invalid order_num)
        const needsUpdate = images.filter((img: any) => 
          img.order_num === null || img.order_num === undefined || img.order_num === 0
        ).length;

        if (needsUpdate === 0) {
          console.log(`✓ Girl ${girlId}: All ${imageCount} images already have order_num, skipping`);
          continue;
        }

        console.log(`📝 Girl ${girlId}: Processing ${imageCount} images, ${needsUpdate} need order_num`);

        // Assign order_num sequentially (1, 2, 3, ...)
        let updateCount = 0;
        for (let i = 0; i < images.length; i++) {
          const imageId = Number(images[i].id);
          const newOrderNum = i + 1;

          // Only update if order_num is NULL, undefined, or 0
          const currentOrderNum = images[i].order_num;
          if (currentOrderNum === null || currentOrderNum === undefined || currentOrderNum === 0) {
            const updateResult = await client.query(
              `UPDATE images SET order_num = $1 WHERE id = $2`,
              [newOrderNum, imageId]
            );

            if (updateResult.rowCount === 1) {
              updateCount++;
            } else if (updateResult.rowCount === 0) {
              console.warn(`  ⚠️  Image ID ${imageId} not found (may have been deleted)`);
            } else {
              console.error(`  ❌ CRITICAL - UPDATE for image ID ${imageId} affected ${updateResult.rowCount} rows (expected 1)`);
              errors.push({ girlId, error: `UPDATE for image ID ${imageId} affected ${updateResult.rowCount} rows` });
            }
          }
        }

        totalProcessed += imageCount;
        totalUpdated += updateCount;
        console.log(`  ✅ Updated ${updateCount} of ${imageCount} images\n`);

      } catch (girlError: any) {
        console.error(`❌ Error processing girl ${girlId}:`, girlError.message);
        errors.push({ girlId, error: girlError.message || 'Unknown error' });
      }
    }

    // Safety check: Verify no NULL order_num remains for gallery images
    const nullCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM images
      WHERE mytp = 4 AND (order_num IS NULL OR order_num = 0)
    `);

    const remainingNulls = Number(nullCheck.rows[0]?.count || 0);

    if (remainingNulls > 0) {
      await client.query('ROLLBACK');
      client.release();
      console.error(`\n❌ BACKFILL INCOMPLETE: ${remainingNulls} images still have NULL or 0 order_num`);
      console.error('Errors:', errors);
      process.exit(1);
    }

    await client.query('COMMIT');
    client.release();

    console.log(`\n✅ SUCCESS!`);
    console.log(`   Processed: ${totalProcessed} images`);
    console.log(`   Updated: ${totalUpdated} images`);
    console.log(`   Girls: ${girlIds.length}`);
    console.log(`   Remaining NULLs: 0`);
    
    if (errors.length > 0) {
      console.warn(`\n⚠️  Warnings: ${errors.length} errors occurred (see above)`);
    }

    console.log(`\n✅ Backfill complete! You can now run the migration SQL.`);

  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

// Run the backfill
backfillOrderNum().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

