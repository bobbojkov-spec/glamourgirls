import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { createClient } from '@supabase/supabase-js';

/**
 * Delete a file from Supabase Storage
 * @param storagePath - Path in storage (without leading slash)
 * @param bucket - Bucket name
 * @returns true if deleted successfully or not found, false on error
 */
async function deleteFromSupabaseStorage(
  storagePath: string,
  bucket: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: 'Supabase configuration missing' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Remove leading slash and normalize path
    const cleanPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([cleanPath]);

    if (error) {
      // If file doesn't exist, that's okay - it's already deleted
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Find HQ image associated with a gallery image by ID pattern
 * @param galleryId - Gallery image ID
 * @param girlId - Girl ID (for additional validation)
 * @returns HQ image record or null
 */
async function findHQImage(galleryId: number, girlId: number): Promise<any | null> {
  try {
    // Try galleryId - 1 first (most common pattern)
    const [hqImages1] = await pool.execute(
      `SELECT id, path, storage_paths FROM images WHERE id = ? AND mytp = 5 AND girlid = ?`,
      [galleryId - 1, girlId]
    ) as any[];

    if (Array.isArray(hqImages1) && hqImages1.length > 0) {
      return hqImages1[0];
    }

    // Try galleryId + 1
    const [hqImages2] = await pool.execute(
      `SELECT id, path, storage_paths FROM images WHERE id = ? AND mytp = 5 AND girlid = ?`,
      [galleryId + 1, girlId]
    ) as any[];

    if (Array.isArray(hqImages2) && hqImages2.length > 0) {
      return hqImages2[0];
    }

    return null;
  } catch (error) {
    console.error('Error finding HQ image:', error);
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  
  // Check for debug mode
  const url = new URL(request.url);
  const isDebugMode = url.searchParams.get('debug') === '1' || process.env.NODE_ENV === 'development';
  
  const deletionErrors: string[] = [];
  const deletionWarnings: string[] = [];

  try {
    const { id } = await params;
    const imageId = parseInt(id);

    if (isNaN(imageId)) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
    }

    // ============================================
    // STEP 1: LOOKUP IMAGE BY ID AND READ ALL STORAGE PATHS
    // ============================================
    const [images] = await pool.execute(
      `SELECT id, path, mytp, thumbid, girlid, storage_paths FROM images WHERE id = ?`,
      [imageId]
    );

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = images[0] as any;
    const imageMytp = Number(image.mytp);
    const imageGirlId = Number(image.girlid);
    const imageStoragePaths = image.storage_paths ? (typeof image.storage_paths === 'string' ? JSON.parse(image.storage_paths) : image.storage_paths) : [];

    console.log(`[Delete] Image ID ${imageId}, Girl ID ${imageGirlId}, Mytp ${imageMytp}, Storage paths: ${imageStoragePaths.length}`);

    // Track what needs to be deleted
    const allStoragePaths: Array<{ path: string; bucket: string }> = [];
    const dbIdsToDelete: number[] = [imageId];

    // If this is a gallery image (mytp=4), find and delete related assets
    if (imageMytp === 4) {
      // 1. Find and delete HQ image - try multiple strategies to ensure we find it
      const hqImage = await findHQImage(imageId, imageGirlId);
      if (hqImage) {
        dbIdsToDelete.push(Number(hqImage.id));
        // Get HQ storage paths
        const hqStoragePaths = hqImage.storage_paths ? (typeof hqImage.storage_paths === 'string' ? JSON.parse(hqImage.storage_paths) : hqImage.storage_paths) : [];
        if (hqStoragePaths.length > 0) {
          for (const sp of hqStoragePaths) {
            const [bucket, path] = sp.includes(':') ? sp.split(':') : ['images_raw', sp];
            allStoragePaths.push({ bucket, path });
          }
        } else if (hqImage.path) {
          // Fallback: use path if storage_paths not available
          allStoragePaths.push({ bucket: 'images_raw', path: hqImage.path.startsWith('/') ? hqImage.path.slice(1) : hqImage.path });
        }
      } else {
        // Also check if there's an HQ image that references this gallery image via storage_paths
        // This handles cases where the ID relationship isn't ±1
        try {
          const [hqByPath] = await pool.execute(
            `SELECT id, path, storage_paths FROM images 
             WHERE girlid = ? AND mytp = 5 
             AND (storage_paths::text LIKE ? OR path LIKE ?)`,
            [imageGirlId, `%${image.path}%`, `%${image.path?.replace(/^\//, '')}%`]
          ) as any[];
          
          if (Array.isArray(hqByPath) && hqByPath.length > 0) {
            const hq = hqByPath[0] as any;
            if (!dbIdsToDelete.includes(Number(hq.id))) {
              dbIdsToDelete.push(Number(hq.id));
              const hqStoragePaths = hq.storage_paths ? (typeof hq.storage_paths === 'string' ? JSON.parse(hq.storage_paths) : hq.storage_paths) : [];
              if (hqStoragePaths.length > 0) {
                for (const sp of hqStoragePaths) {
                  const [bucket, path] = sp.includes(':') ? sp.split(':') : ['images_raw', sp];
                  allStoragePaths.push({ bucket, path });
                }
              } else if (hq.path) {
                allStoragePaths.push({ bucket: 'images_raw', path: hq.path.startsWith('/') ? hq.path.slice(1) : hq.path });
              }
            }
          }
        } catch (e: any) {
          console.warn('[Delete] Could not search for HQ by path:', e.message);
        }
      }

      // 2. Find and delete thumbnail
      if (image.thumbid) {
        const [thumbImages] = await pool.execute(
          `SELECT id, path, storage_paths FROM images WHERE id = ?`,
          [image.thumbid]
        ) as any[];
        
        if (Array.isArray(thumbImages) && thumbImages.length > 0) {
          const thumb = thumbImages[0] as any;
          dbIdsToDelete.push(Number(thumb.id));
          // Get thumbnail storage paths
          const thumbStoragePaths = thumb.storage_paths ? (typeof thumb.storage_paths === 'string' ? JSON.parse(thumb.storage_paths) : thumb.storage_paths) : [];
          if (thumbStoragePaths.length > 0) {
            for (const sp of thumbStoragePaths) {
              const [bucket, path] = sp.includes(':') ? sp.split(':') : ['glamourgirls_images', sp];
              allStoragePaths.push({ bucket, path });
            }
          } else if (thumb.path) {
            // Fallback: use path if storage_paths not available
            allStoragePaths.push({ bucket: 'glamourgirls_images', path: thumb.path.startsWith('/') ? thumb.path.slice(1) : thumb.path });
          }
        }
      }

      // 3. Add gallery image storage paths
      if (imageStoragePaths.length > 0) {
        for (const sp of imageStoragePaths) {
          const [bucket, path] = sp.includes(':') ? sp.split(':') : ['glamourgirls_images', sp];
          allStoragePaths.push({ bucket, path });
        }
      } else if (image.path) {
        // Fallback: use path if storage_paths not available
        allStoragePaths.push({ bucket: 'glamourgirls_images', path: image.path.startsWith('/') ? image.path.slice(1) : image.path });
      }
    } else if (imageMytp === 5) {
      // HQ image: use storage_paths
      if (imageStoragePaths.length > 0) {
        for (const sp of imageStoragePaths) {
          const [bucket, path] = sp.includes(':') ? sp.split(':') : ['images_raw', sp];
          allStoragePaths.push({ bucket, path });
        }
      } else if (image.path) {
        allStoragePaths.push({ bucket: 'images_raw', path: image.path.startsWith('/') ? image.path.slice(1) : image.path });
      }
    } else if (imageMytp === 3) {
      // Thumbnail: use storage_paths
      if (imageStoragePaths.length > 0) {
        for (const sp of imageStoragePaths) {
          const [bucket, path] = sp.includes(':') ? sp.split(':') : ['glamourgirls_images', sp];
          allStoragePaths.push({ bucket, path });
        }
      } else if (image.path) {
        allStoragePaths.push({ bucket: 'glamourgirls_images', path: image.path.startsWith('/') ? image.path.slice(1) : image.path });
      }
      // Update gallery image's thumbid to 0
      await pool.execute(
        `UPDATE images SET thumbid = 0 WHERE thumbid = ?`,
        [imageId]
      );
    } else {
      // For other types, try to delete from glamourgirls_images bucket
      if (imageStoragePaths.length > 0) {
        for (const sp of imageStoragePaths) {
          const [bucket, path] = sp.includes(':') ? sp.split(':') : ['glamourgirls_images', sp];
          allStoragePaths.push({ bucket, path });
        }
      } else if (image.path) {
        allStoragePaths.push({ bucket: 'glamourgirls_images', path: image.path.startsWith('/') ? image.path.slice(1) : image.path });
      }
    }

    // ============================================
    // STEP 2: DELETE ALL STORAGE OBJECTS
    // ============================================
    for (const { bucket, path: storagePath } of allStoragePaths) {
      const result = await deleteFromSupabaseStorage(storagePath, bucket);
      
      if (!result.success) {
        const errorMsg = `Failed to delete from Supabase Storage (${bucket}/${storagePath}): ${result.error}`;
        deletionErrors.push(errorMsg);
        console.error(`[Delete] ${errorMsg}`);
      } else {
        console.log(`[Delete] ✓ Deleted from Supabase Storage: ${bucket}/${storagePath}`);
      }
    }

    // ============================================
    // STEP 3: DELETE DB ROW BY ID + RENORMALIZE ORDER_NUM (SAME TRANSACTION)
    // ============================================
    // CRITICAL: DELETE and renormalization MUST be in the same transaction
    // This ensures order_num is always continuous (1..N) after delete
    const { getPool } = await import('@/lib/db');
    const pgPool = getPool();
    const deleteClient = await pgPool.connect();
    
    try {
      await deleteClient.query('BEGIN');
      
      // PART A: DELETE IMAGE BY ID ONLY
      let totalDeleted = 0;
      for (const dbId of dbIdsToDelete) {
        const deleteResult = await deleteClient.query(
          `DELETE FROM images WHERE id = $1`,
          [dbId]
        );
        const affectedRows = deleteResult.rowCount || 0;
        
        // Safety guard: DELETE must affect exactly 1 row
        if (affectedRows > 1) {
          await deleteClient.query('ROLLBACK');
          const errorMsg = `CRITICAL: DELETE affected ${affectedRows} rows for id ${dbId} (expected 1)`;
          console.error(`[Delete] ${errorMsg}`);
          deletionErrors.push(errorMsg);
          deleteClient.release();
          return NextResponse.json(
            { error: errorMsg, details: deletionErrors },
            { status: 500 }
          );
        } else if (affectedRows === 1) {
          totalDeleted++;
          console.log(`[Delete] ✓ Deleted image record from database: ID ${dbId}`);
        } else {
          // Image not found - this is okay if it was already deleted
          console.warn(`[Delete] Image record ID ${dbId} not found in database (may have been already deleted)`);
        }
      }
      
      // PART B: RE-NORMALIZE ORDER_NUM FOR REMAINING GALLERY IMAGES (SAME TRANSACTION)
      // Only renormalize if we deleted a gallery image (mytp = 4)
      if (imageMytp === 4 && imageGirlId && totalDeleted > 0) {
        console.log(`[Delete] Starting renormalization for girl ${imageGirlId} after deleting ${totalDeleted} gallery image(s)`);
        
        // Get remaining gallery images, ordered by current order_num (NULLs go last), then id
        const remainingResult = await deleteClient.query(
          `SELECT id FROM images WHERE girlid = $1 AND mytp = 4 ORDER BY COALESCE(order_num, 999999) ASC, id ASC`,
          [imageGirlId]
        );
        
        const remainingImages = remainingResult.rows;
        console.log(`[Delete] Found ${remainingImages.length} remaining gallery images to renormalize`);
        
        if (remainingImages.length > 0) {
          // Renormalize to 1..N sequentially (continuous, no gaps)
          let updateCount = 0;
          for (let i = 0; i < remainingImages.length; i++) {
            const imageIdToUpdate = Number(remainingImages[i].id);
            const newOrderNum = i + 1; // Start at 1, increment sequentially
            
            const updateResult = await deleteClient.query(
              `UPDATE images SET order_num = $1 WHERE id = $2`,
              [newOrderNum, imageIdToUpdate]
            );
            
            const rowsAffected = updateResult.rowCount || 0;
            if (rowsAffected === 1) {
              updateCount++;
              console.log(`[Delete] Renormalized image ID ${imageIdToUpdate} to order_num ${newOrderNum}`);
            } else if (rowsAffected === 0) {
              console.warn(`[Delete] Image ID ${imageIdToUpdate} not found during renormalization (may have been deleted)`);
            } else {
              await deleteClient.query('ROLLBACK');
              deleteClient.release();
              const errorMsg = `CRITICAL: UPDATE during renormalization for image ID ${imageIdToUpdate} affected ${rowsAffected} rows (expected 1)`;
              console.error(`[Delete] ${errorMsg}`);
              deletionErrors.push(errorMsg);
              return NextResponse.json(
                { error: errorMsg, details: deletionErrors },
                { status: 500 }
              );
            }
          }
          
          // SAFETY GUARD: Verify renormalization succeeded
          if (updateCount !== remainingImages.length) {
            await deleteClient.query('ROLLBACK');
            deleteClient.release();
            const errorMsg = `CRITICAL: Renormalization failed - updated ${updateCount} of ${remainingImages.length} images`;
            console.error(`[Delete] ${errorMsg}`);
            deletionErrors.push(errorMsg);
            return NextResponse.json(
              { error: errorMsg, details: deletionErrors },
              { status: 500 }
            );
          }
          
          // SAFETY GUARD: Verify final state (COUNT == MAX(order_num), MIN == 1, no NULLs)
          const verificationResult = await deleteClient.query(
            `SELECT 
              COUNT(*) as total_count,
              COUNT(*) FILTER (WHERE order_num IS NOT NULL) as non_null_count,
              COALESCE(MIN(order_num), 0) as min_order,
              COALESCE(MAX(order_num), 0) as max_order
             FROM images 
             WHERE girlid = $1 AND mytp = 4`,
            [imageGirlId]
          );
          
          const verification = verificationResult.rows[0];
          const totalCount = Number(verification.total_count) || 0;
          const nonNullCount = Number(verification.non_null_count) || 0;
          const minOrder = Number(verification.min_order) || 0;
          const maxOrder = Number(verification.max_order) || 0;
          
          console.log(`[Delete] Verification after renormalization: total=${totalCount}, nonNull=${nonNullCount}, min=${minOrder}, max=${maxOrder}`);
          
          // Verify: no NULLs, COUNT == MAX(order_num), and MIN == 1
          if (totalCount !== nonNullCount) {
            await deleteClient.query('ROLLBACK');
            deleteClient.release();
            const errorMsg = `CRITICAL: Renormalization verification failed - found NULL order_num values (total=${totalCount}, nonNull=${nonNullCount})`;
            console.error(`[Delete] ${errorMsg}`);
            deletionErrors.push(errorMsg);
            return NextResponse.json(
              { error: errorMsg, details: deletionErrors },
              { status: 500 }
            );
          }
          
          if (totalCount !== maxOrder || minOrder !== 1) {
            await deleteClient.query('ROLLBACK');
            deleteClient.release();
            const errorMsg = `CRITICAL: Renormalization verification failed - total=${totalCount}, min=${minOrder}, max=${maxOrder} (expected: total=${maxOrder}, min=1)`;
            console.error(`[Delete] ${errorMsg}`);
            deletionErrors.push(errorMsg);
            return NextResponse.json(
              { error: errorMsg, details: deletionErrors },
              { status: 500 }
            );
          }
          
          console.log(`[Delete] ✓ Renormalized order_num for ${updateCount} remaining images - verification passed (total=${totalCount}, min=${minOrder}, max=${maxOrder}, no NULLs)`);
        } else {
          console.log(`[Delete] No remaining gallery images to renormalize for girl ${imageGirlId}`);
        }
      }
      
      // Commit transaction (DELETE + renormalization)
      await deleteClient.query('COMMIT');
      console.log(`[Delete] ✓ Transaction committed: deleted ${totalDeleted} image(s), renormalization complete`);
      
    } catch (deleteError: any) {
      await deleteClient.query('ROLLBACK').catch(() => {});
      const errorMsg = `Failed to delete image(s) or renormalize order_num: ${deleteError.message}`;
      console.error(`[Delete] ${errorMsg}`, deleteError);
      deletionErrors.push(errorMsg);
      deleteClient.release();
      return NextResponse.json(
        { error: errorMsg, details: deletionErrors },
        { status: 500 }
      );
    } finally {
      deleteClient.release();
    }

    // ============================================
    // STEP 5: RETURN RESULT
    // ============================================
    // If there were critical errors (database deletion failures), return error
    // Storage deletion failures are logged but don't block the operation
    if (deletionErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Some deletions failed',
        details: deletionErrors,
        warnings: deletionWarnings.length > 0 ? deletionWarnings : undefined,
      }, { status: 500 });
    }

    const response: any = {
      success: true,
      message: 'Image and all related assets deleted successfully',
      deleted: true,
      deletedStoragePaths: allStoragePaths.length,
      deletedDbRows: dbIdsToDelete.length,
      warnings: deletionWarnings.length > 0 ? deletionWarnings : undefined,
    };
    
    // Add debug info if debug mode is enabled
    if (isDebugMode) {
      response.debug = {
        imageId: imageId,
        deletedIds: dbIdsToDelete,
        deletedStoragePaths: allStoragePaths.length,
        deletedDbRows: dbIdsToDelete.length,
        storagePaths: allStoragePaths,
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Delete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



