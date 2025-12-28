import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Repair script to find and clean up orphaned HQ images
 * 
 * Finds:
 * 1. HQ images (mytp=5) that don't have a corresponding gallery image (mytp=4)
 * 2. Orphaned storage objects that don't have a DB record
 * 
 * Options:
 * - dryRun: true = only report, don't delete
 * - deleteOrphans: true = delete orphaned HQ DB rows
 * - deleteStorage: true = delete orphaned storage objects
 */
export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false; // Default to true for safety
    const deleteOrphans = body.deleteOrphans === true;
    const deleteStorage = body.deleteStorage === true;

    const report = {
      dryRun,
      orphanedHQImages: [] as Array<{ id: number; girlid: number; path: string; storage_paths: string[] }>,
      orphanedStorageObjects: [] as Array<{ bucket: string; path: string }>,
      deleted: {
        dbRows: 0,
        storageObjects: 0,
      },
      errors: [] as string[],
    };

    // ============================================
    // STEP 1: FIND ORPHANED HQ IMAGES (mytp=5 without matching mytp=4)
    // ============================================
    console.log('[Repair] Finding orphaned HQ images...');
    
    const [orphanedHQ] = await pool.execute(`
      SELECT i.id, i.girlid, i.path, i.storage_paths
      FROM images i
      WHERE i.mytp = 5
        AND NOT EXISTS (
          SELECT 1 FROM images i2 
          WHERE i2.girlid = i.girlid 
            AND i2.mytp = 4 
            AND (i2.id = i.id - 1 OR i2.id = i.id + 1)
        )
      ORDER BY i.girlid, i.id
    `) as any[];

    if (Array.isArray(orphanedHQ)) {
      for (const hq of orphanedHQ) {
        const storagePaths = hq.storage_paths 
          ? (typeof hq.storage_paths === 'string' ? JSON.parse(hq.storage_paths) : hq.storage_paths)
          : [];
        
        report.orphanedHQImages.push({
          id: Number(hq.id),
          girlid: Number(hq.girlid),
          path: String(hq.path || ''),
          storage_paths: Array.isArray(storagePaths) ? storagePaths : [],
        });
      }
    }

    console.log(`[Repair] Found ${report.orphanedHQImages.length} orphaned HQ images`);

    // ============================================
    // STEP 2: DELETE ORPHANED HQ DB ROWS (if requested)
    // ============================================
    if (deleteOrphans && !dryRun) {
      for (const orphan of report.orphanedHQImages) {
        try {
          const result = await pool.execute(
            `DELETE FROM images WHERE id = ? AND mytp = 5`,
            [orphan.id]
          );
          const affectedRows = Array.isArray(result) ? (result[0] as any[]).length : 0;
          
          if (affectedRows === 1) {
            report.deleted.dbRows++;
            console.log(`[Repair] ✓ Deleted orphaned HQ DB row: ID ${orphan.id}`);
          } else if (affectedRows > 1) {
            report.errors.push(`CRITICAL: Deleted ${affectedRows} rows for ID ${orphan.id} (expected 1)`);
          }
        } catch (error: any) {
          report.errors.push(`Failed to delete HQ row ID ${orphan.id}: ${error.message}`);
          console.error(`[Repair] Error deleting HQ row ${orphan.id}:`, error);
        }
      }
    }

    // ============================================
    // STEP 3: FIND ORPHANED STORAGE OBJECTS (optional - requires Supabase access)
    // ============================================
    if (deleteStorage && !dryRun) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Get all HQ storage paths from DB
          const [allHQPaths] = await pool.execute(`
            SELECT storage_paths FROM images WHERE mytp = 5 AND storage_paths IS NOT NULL
          `) as any[];

          const dbStoragePaths = new Set<string>();
          if (Array.isArray(allHQPaths)) {
            for (const row of allHQPaths) {
              const paths = row.storage_paths 
                ? (typeof row.storage_paths === 'string' ? JSON.parse(row.storage_paths) : row.storage_paths)
                : [];
              if (Array.isArray(paths)) {
                for (const sp of paths) {
                  const [bucket, path] = sp.includes(':') ? sp.split(':') : ['images_raw', sp];
                  dbStoragePaths.add(`${bucket}:${path}`);
                }
              }
            }
          }

          // List all files in images_raw bucket (HQ images)
          const { data: files, error: listError } = await supabase.storage
            .from('images_raw')
            .list('', { limit: 10000, sortBy: { column: 'name', order: 'asc' } });

          if (listError) {
            report.errors.push(`Failed to list storage files: ${listError.message}`);
          } else if (files) {
            for (const file of files) {
              const storagePath = `images_raw:${file.name}`;
              if (!dbStoragePaths.has(storagePath)) {
                report.orphanedStorageObjects.push({
                  bucket: 'images_raw',
                  path: file.name,
                });
              }
            }
          }

          // Delete orphaned storage objects
          for (const orphan of report.orphanedStorageObjects) {
            try {
              const { error: deleteError } = await supabase.storage
                .from(orphan.bucket)
                .remove([orphan.path]);

              if (deleteError) {
                if (!deleteError.message?.includes('not found')) {
                  report.errors.push(`Failed to delete storage ${orphan.bucket}/${orphan.path}: ${deleteError.message}`);
                }
              } else {
                report.deleted.storageObjects++;
                console.log(`[Repair] ✓ Deleted orphaned storage: ${orphan.bucket}/${orphan.path}`);
              }
            } catch (error: any) {
              report.errors.push(`Error deleting storage ${orphan.bucket}/${orphan.path}: ${error.message}`);
            }
          }
        } catch (error: any) {
          report.errors.push(`Storage cleanup error: ${error.message}`);
          console.error('[Repair] Storage cleanup error:', error);
        }
      } else {
        report.errors.push('Supabase configuration missing - cannot check storage');
      }
    }

    // ============================================
    // STEP 4: RETURN REPORT
    // ============================================
    return NextResponse.json({
      success: true,
      report: {
        ...report,
        summary: {
          orphanedHQCount: report.orphanedHQImages.length,
          orphanedStorageCount: report.orphanedStorageObjects.length,
          deletedDBRows: report.deleted.dbRows,
          deletedStorageObjects: report.deleted.storageObjects,
          errorCount: report.errors.length,
        },
      },
    });
  } catch (error) {
    console.error('[Repair] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run repair', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

