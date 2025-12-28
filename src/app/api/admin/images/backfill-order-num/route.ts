import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

export const runtime = 'nodejs';

/**
 * One-time backfill script to set order_num for all existing images
 * 
 * Processes images PER GIRL (grouped by girlid)
 * For each girl:
 *   - Select images ordered by: created_at ASC, id ASC (stable ordering)
 *   - Assign order_num sequentially starting at 1
 * 
 * IMPORTANT: This is a ONE-TIME migration script. Run it once in production
 * to fix all existing NULL order_num values.
 */
export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    // Check if order_num column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'images' AND column_name = 'order_num'
    `);
    const hasOrderNum = columnCheck.rows.length > 0;

    if (!hasOrderNum) {
      client.release();
      return NextResponse.json(
        { error: 'order_num column does not exist. Please add the column first.' },
        { status: 500 }
      );
    }

    await client.query('BEGIN');

    // Get all distinct girlids that have gallery images (mytp = 4)
    const girlsResult = await client.query(`
      SELECT DISTINCT girlid 
      FROM images 
      WHERE mytp = 4
      ORDER BY girlid ASC
    `);

    const girlIds = girlsResult.rows.map((row: any) => Number(row.girlid));
    console.log(`[Backfill] Processing ${girlIds.length} girls with gallery images`);

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
          console.log(`[Backfill] Girl ${girlId}: All ${imageCount} images already have order_num, skipping`);
          continue;
        }

        console.log(`[Backfill] Girl ${girlId}: Processing ${imageCount} images, ${needsUpdate} need order_num`);

        // Assign order_num sequentially (1, 2, 3, ...)
        let updateCount = 0;
        for (let i = 0; i < images.length; i++) {
          const imageId = Number(images[i].id);
          const newOrderNum = i + 1;

          // Only update if order_num is NULL, undefined, or 0
          // If it already has a valid order_num, preserve it (don't overwrite)
          const currentOrderNum = images[i].order_num;
          if (currentOrderNum === null || currentOrderNum === undefined || currentOrderNum === 0) {
            const updateResult = await client.query(
              `UPDATE images SET order_num = $1 WHERE id = $2`,
              [newOrderNum, imageId]
            );

            if (updateResult.rowCount === 1) {
              updateCount++;
            } else if (updateResult.rowCount === 0) {
              console.warn(`[Backfill] Girl ${girlId}: Image ID ${imageId} not found (may have been deleted)`);
            } else {
              console.error(`[Backfill] Girl ${girlId}: CRITICAL - UPDATE for image ID ${imageId} affected ${updateResult.rowCount} rows (expected 1)`);
              errors.push({ girlId, error: `UPDATE for image ID ${imageId} affected ${updateResult.rowCount} rows` });
            }
          }
        }

        totalProcessed += imageCount;
        totalUpdated += updateCount;
        console.log(`[Backfill] Girl ${girlId}: Updated ${updateCount} of ${imageCount} images`);

      } catch (girlError: any) {
        console.error(`[Backfill] Error processing girl ${girlId}:`, girlError);
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
      return NextResponse.json(
        {
          success: false,
          error: `Backfill incomplete: ${remainingNulls} images still have NULL or 0 order_num`,
          processed: totalProcessed,
          updated: totalUpdated,
          remainingNulls: remainingNulls,
          errors: errors,
        },
        { status: 500 }
      );
    }

    await client.query('COMMIT');
    client.release();

    console.log(`[Backfill] ✓ SUCCESS: Processed ${totalProcessed} images, updated ${totalUpdated} images, ${girlIds.length} girls`);

    return NextResponse.json({
      success: true,
      message: `Successfully backfilled order_num for ${totalUpdated} images across ${girlIds.length} girls`,
      processed: totalProcessed,
      updated: totalUpdated,
      girlsProcessed: girlIds.length,
      remainingNulls: 0,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('[Backfill] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to backfill order_num',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current state (verification)
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    // Check total gallery images
    const totalResult = await client.query(`
      SELECT COUNT(*) as count
      FROM images
      WHERE mytp = 4
    `);
    const total = Number(totalResult.rows[0]?.count || 0);

    // Check images with valid order_num
    const withOrderResult = await client.query(`
      SELECT COUNT(*) as count
      FROM images
      WHERE mytp = 4 AND order_num IS NOT NULL AND order_num > 0
    `);
    const withOrder = Number(withOrderResult.rows[0]?.count || 0);

    // Check images without order_num
    const withoutOrderResult = await client.query(`
      SELECT COUNT(*) as count
      FROM images
      WHERE mytp = 4 AND (order_num IS NULL OR order_num = 0)
    `);
    const withoutOrder = Number(withoutOrderResult.rows[0]?.count || 0);

    // Check for gaps or duplicates per girl
    const gapsResult = await client.query(`
      SELECT girlid, COUNT(*) as total, MIN(order_num) as min_order, MAX(order_num) as max_order
      FROM images
      WHERE mytp = 4 AND order_num IS NOT NULL AND order_num > 0
      GROUP BY girlid
      HAVING COUNT(*) != MAX(order_num) - MIN(order_num) + 1 OR MIN(order_num) != 1
    `);

    const girlsWithGaps = gapsResult.rows.map((row: any) => ({
      girlId: Number(row.girlid),
      total: Number(row.total),
      minOrder: Number(row.min_order),
      maxOrder: Number(row.max_order),
    }));

    client.release();

    return NextResponse.json({
      total,
      withOrder,
      withoutOrder,
      isComplete: withoutOrder === 0 && girlsWithGaps.length === 0,
      girlsWithGaps: girlsWithGaps.length > 0 ? girlsWithGaps : undefined,
    });

  } catch (error: any) {
    client.release();
    console.error('[Backfill Verify] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify backfill status',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

