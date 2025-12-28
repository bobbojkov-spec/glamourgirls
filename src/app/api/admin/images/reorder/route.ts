import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import type { ReorderImagesRequest } from '@/types/admin-image';

export const runtime = 'nodejs';

/**
 * Reorder images endpoint (SERVER-AUTHORITATIVE)
 * 
 * Accepts: { girlId: number, orderedImageIds: [id1, id2, id3, ...] }
 * Backend assigns order_num sequentially: 1, 2, 3, ...
 * Frontend NEVER sends order_num - server owns ordering completely
 * 
 * Returns: Updated images sorted by order_num
 */
export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  
  // Check for debug mode
  const url = new URL(request.url);
  const isDebugMode = url.searchParams.get('debug') === '1' || process.env.NODE_ENV === 'development';
  
  try {
    const body: ReorderImagesRequest = await request.json();
    
    // STEP 2: UNMISSABLE LOGGING - Start of reorder operation
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 REORDER START');
    console.log(`  girlId: ${body.girlId}`);
    console.log(`  girlId typeof: ${typeof (body as any).girlId}`);
    console.log(`  orderedImageIds: [${body.orderedImageIds?.join(', ') || ''}]`);
    console.log(`  imageCount: ${body.orderedImageIds?.length || 0}`);
    console.log(`  orderedImageIds types: [${(body.orderedImageIds || []).slice(0, 10).map((id: any) => typeof id).join(', ')}]${(body.orderedImageIds || []).length > 10 ? ' ...' : ''}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    // Validate request
    if (typeof body.girlId !== 'number' || isNaN(body.girlId) || body.girlId < 1) {
      return NextResponse.json({ error: 'Invalid request: girlId is required and must be a positive integer' }, { status: 400 });
    }
    
    if (!body.orderedImageIds || !Array.isArray(body.orderedImageIds) || body.orderedImageIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request: orderedImageIds array required' }, { status: 400 });
    }
    
    // Validate all IDs are numbers
    for (const id of body.orderedImageIds) {
      if (typeof id !== 'number' || isNaN(id) || id < 1) {
        console.error('[Reorder] Invalid image ID:', id);
        return NextResponse.json(
          { error: `Invalid image ID: ${id}. All IDs must be positive integers.` },
          { status: 400 }
        );
      }
    }
    
    const pgPool = getPool();
    const client = await pgPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if order_num column exists (backward compatibility)
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'order_num'
      `);
      const hasOrderNum = columnCheck.rows.length > 0;
      
      if (!hasOrderNum) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'order_num column does not exist. Please run the database migration first.' },
          { status: 500 }
        );
      }
      
      // Verify all image IDs exist, are gallery images (mytp = 4), and belong to the girl
      const verifyResult = await client.query(
        `SELECT id, girlid FROM images WHERE id = ANY($1::int[]) AND mytp = 4 AND girlid = $2`,
        [body.orderedImageIds, body.girlId]
      );
      
      if (verifyResult.rows.length !== body.orderedImageIds.length) {
        await client.query('ROLLBACK');
        // Provide a precise breakdown: not found vs wrong girl vs wrong type.
        const requestedIds = body.orderedImageIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0);
        const matchedIds = verifyResult.rows.map((r: any) => Number(r.id)).filter((n: number) => Number.isFinite(n));
        const failedIds = requestedIds.filter((id) => !matchedIds.includes(id));

        let inspectionRows: Array<{ id: number; girlid: number | null; mytp: number | null }> = [];
        try {
          const inspection = await client.query(
            `SELECT id, girlid, mytp FROM images WHERE id = ANY($1::int[])`,
            [failedIds]
          );
          inspectionRows = inspection.rows.map((r: any) => ({
            id: Number(r.id),
            girlid: r.girlid === null || r.girlid === undefined ? null : Number(r.girlid),
            mytp: r.mytp === null || r.mytp === undefined ? null : Number(r.mytp),
          }));
        } catch (e: any) {
          console.warn('[Reorder] Failed to inspect failing IDs:', e?.message || String(e));
        }

        const foundFailingIds = inspectionRows.map((r) => r.id).filter((n) => Number.isFinite(n));
        const notFound = failedIds.filter((id) => !foundFailingIds.includes(id));
        const wrongGirl = inspectionRows
          .filter((r) => r.girlid !== null && r.girlid !== body.girlId)
          .map((r) => ({ id: r.id, actualGirlId: r.girlid }));
        const wrongType = inspectionRows
          .filter((r) => r.mytp !== null && r.mytp !== 4)
          .map((r) => ({ id: r.id, actualMytp: r.mytp }));

        console.error(`[Reorder] Ownership/type validation failed for girl ${body.girlId}:`, {
          requestedCount: requestedIds.length,
          matchedCount: verifyResult.rows.length,
          failedIds,
          notFound,
          wrongGirl,
          wrongType,
        });

        const baseResponse: any = {
          error: 'Ownership validation failed',
          details: 'Some image IDs do not belong to the specified girl, are not gallery images (mytp=4), or do not exist.',
          failedIds,
        };
        if (isDebugMode) {
          baseResponse.debug = {
            girlId: body.girlId,
            requestedIds,
            matchedIds,
            notFound,
            wrongGirl,
            wrongType,
            inspectionRows,
          };
        }

        return NextResponse.json(baseResponse, { status: 400 });
      }
      
      // Verify all images belong to the specified girl (double-check)
      const girlIds = [
        ...new Set(
          verifyResult.rows
            .map((r: any) => Number(r.girlid))
            .filter((n: number) => Number.isFinite(n))
        ),
      ];
      if (girlIds.length > 1 || (girlIds.length === 1 && girlIds[0] !== body.girlId)) {
        await client.query('ROLLBACK');
        console.error(`[Reorder] Images belong to different girl than specified:`, { expected: body.girlId, found: girlIds });
        return NextResponse.json(
          { error: 'All images must belong to the specified girl.' },
          { status: 400 }
        );
      }
      
      // SERVER-AUTHORITATIVE: Assign order_num sequentially based on array position
      // Position 0 = order_num 1, Position 1 = order_num 2, etc.
      let totalRowsUpdated = 0;
      const updateResults: Array<{ id: number; orderNum: number; rowsAffected: number }> = [];
      
      for (let index = 0; index < body.orderedImageIds.length; index++) {
        const imageId = body.orderedImageIds[index];
        const orderNum = index + 1; // Server assigns: 1, 2, 3, ...
        
        const result = await client.query(
          `UPDATE images SET order_num = $1 WHERE id = $2`,
          [orderNum, imageId]
        );
        
        const rowsAffected = result.rowCount || 0;
        updateResults.push({ id: imageId, orderNum, rowsAffected });
        totalRowsUpdated += rowsAffected;
        
        console.log(`[Reorder] Updated image id ${imageId} to order_num ${orderNum} (${rowsAffected} row affected)`);
        
        if (rowsAffected === 0) {
          await client.query('ROLLBACK');
          console.error(`[Reorder] CRITICAL: UPDATE for image id ${imageId} affected 0 rows`);
          return NextResponse.json(
            { error: `Failed to update image ID ${imageId}. Image may not exist.` },
            { status: 404 }
          );
        } else if (rowsAffected > 1) {
          // This should NEVER happen if we're updating by primary key
          await client.query('ROLLBACK');
          console.error(`[Reorder] CRITICAL: UPDATE for image id ${imageId} affected ${rowsAffected} rows (expected 1) - possible data corruption`);
          return NextResponse.json(
            { error: `Database error: Update affected multiple rows for image ID ${imageId}` },
            { status: 500 }
          );
        }
      }
      
      // CRITICAL: Verify all updates succeeded - if rowsUpdated === 0, this is a NO-OP
      if (totalRowsUpdated === 0) {
        await client.query('ROLLBACK');
        console.error(`[Reorder] CRITICAL: NO rows were updated (totalRowsUpdated === 0). This indicates a NO-OP.`);
        return NextResponse.json(
          { error: `CRITICAL: No rows were updated. Reorder failed to persist.` },
          { status: 500 }
        );
      }
      
      if (totalRowsUpdated !== body.orderedImageIds.length) {
        await client.query('ROLLBACK');
        console.error(`[Reorder] CRITICAL: Expected ${body.orderedImageIds.length} updates, but only ${totalRowsUpdated} rows were updated`);
        return NextResponse.json(
          { error: `Expected ${body.orderedImageIds.length} updates, but only ${totalRowsUpdated} rows were updated` },
          { status: 500 }
        );
      }
      
      await client.query('COMMIT');
      
      // STEP 2: UNMISSABLE LOGGING - After DB update
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ REORDER UPDATED');
      console.log(`  rowsUpdated: ${totalRowsUpdated}`);
      console.log(`  expected: ${body.orderedImageIds.length}`);
      console.log(`  match: ${totalRowsUpdated === body.orderedImageIds.length ? '✓ YES' : '✗ NO - MISMATCH!'}`);
      console.log('═══════════════════════════════════════════════════════════');
      
      // Return updated images sorted by order_num (SERVER-AUTHORITATIVE response)
      const imagesResult = await client.query(
        `SELECT id, path, width, height, mytp, description, order_num
         FROM images 
         WHERE girlid = $1 AND mytp = 4
         ORDER BY COALESCE(order_num, 999999) ASC, id ASC`,
        [body.girlId]
      );
      
      // STEP 2: UNMISSABLE LOGGING - After fetch (first 5 images)
      const first5 = imagesResult.rows.slice(0, 5).map((img: any) => ({
        id: Number(img.id),
        order_num: img.order_num !== null && img.order_num !== undefined ? Number(img.order_num) : null,
      }));
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 REORDER RETURN (first 5 images)');
      console.log(`  first5:`, JSON.stringify(first5, null, 2));
      console.log(`  totalImages: ${imagesResult.rows.length}`);
      console.log('═══════════════════════════════════════════════════════════');
      
      const response: any = {
        success: true,
        message: `Successfully reordered ${totalRowsUpdated} image(s)`,
        updateCount: totalRowsUpdated,
        images: imagesResult.rows.map((img: any) => ({
          id: Number(img.id),
          orderNum: img.order_num !== null && img.order_num !== undefined ? Number(img.order_num) : null,
          path: img.path,
          width: Number(img.width) || 0,
          height: Number(img.height) || 0,
          description: img.description || null,
        })),
      };
      
      // Add debug info if debug mode is enabled
      if (isDebugMode) {
        response.debug = {
          receivedOrderedImageIds: body.orderedImageIds,
          receivedCount: body.orderedImageIds.length,
          rowsUpdated: totalRowsUpdated,
          updateResults: updateResults,
        };
      }
      
      return NextResponse.json(response);
    } catch (dbError: any) {
      await client.query('ROLLBACK').catch(() => {});
      // STEP 2: UNMISSABLE LOGGING - DB errors
      console.error('═══════════════════════════════════════════════════════════');
      console.error('❌ REORDER DB ERROR');
      console.error(`  error: ${dbError?.message || String(dbError)}`);
      console.error(`  code: ${dbError?.code || 'N/A'}`);
      console.error(`  stack: ${dbError?.stack || 'N/A'}`);
      console.error('═══════════════════════════════════════════════════════════');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as any;
    console.error('[Reorder] Error:', err);
    return NextResponse.json(
      {
        error: 'Failed to reorder images',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
