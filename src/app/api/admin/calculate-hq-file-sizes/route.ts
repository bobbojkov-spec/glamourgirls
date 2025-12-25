import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { fetchFromStorage, fetchFromStorageWithClient } from '@/lib/supabase/storage';
import { requireAdminApi } from '@/app/api/admin/_auth';

export const runtime = 'nodejs';

// Helper function to format image description
function formatImageDescription(width: number, height: number, fileSizeBytes: number): string {
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  return `${width} × ${height} px (${fileSizeMB} MB)`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminApi(request);

    const pgPool = getPool();
    const client = await pgPool.connect();

    try {
      // Count HQ images that need processing
      // Note: sz might be stored as varchar, so we need to cast it properly
      const countResult = await client.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE 
            WHEN sz IS NULL 
            OR sz::text = '' 
            OR (sz::text ~ '^[0-9]+$' AND (sz::bigint = 0 OR sz::bigint IS NULL))
            THEN 1 
          END)::int as missing_sz,
          COUNT(CASE 
            WHEN sz IS NOT NULL 
            AND sz::text != '' 
            AND sz::text ~ '^[0-9]+$' 
            AND sz::bigint > 0
            THEN 1 
          END)::int as has_sz
        FROM images
        WHERE mytp = 5
          AND (width > 1200 OR height > 1200)
          AND width IS NOT NULL 
          AND height IS NOT NULL
      `);

      const stats = countResult.rows[0];

      return NextResponse.json({
        success: true,
        total: parseInt(stats?.total || '0', 10) || 0,
        missingSz: parseInt(stats?.missing_sz || '0', 10) || 0,
        hasSz: parseInt(stats?.has_sz || '0', 10) || 0,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching HQ file size stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminApi(request);

    const body = await request.json().catch(() => ({}));
    const { action = 'calculate', limit } = body || {};

    if (action === 'cleanup') {
      // Cleanup action - remove sz and description
      const pgPool = getPool();
      const client = await pgPool.connect();

      try {
        const result = await client.query(`
          UPDATE images
          SET sz = NULL, description = NULL
          WHERE mytp = 5
            AND (width > 1200 OR height > 1200)
            AND (sz IS NOT NULL OR description IS NOT NULL)
        `);

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${result.rowCount} records`,
          cleaned: result.rowCount,
        });
      } finally {
        client.release();
      }
    }

    // Calculate file sizes
    const pgPool = getPool();
    const client = await pgPool.connect();

    try {
      // Get HQ images where long side > 1200px
      // If limit is provided, only process that many (for testing)
      const limitValue = limit && limit > 0 ? parseInt(limit.toString(), 10) : null;
      const query = limitValue 
        ? `
          SELECT id, girlid, path, width, height, sz, description, mytp
          FROM images
          WHERE mytp = 5
            AND (width > 1200 OR height > 1200)
            AND width IS NOT NULL 
            AND height IS NOT NULL
          ORDER BY id
          LIMIT $1
        `
        : `
          SELECT id, girlid, path, width, height, sz, description, mytp
          FROM images
          WHERE mytp = 5
            AND (width > 1200 OR height > 1200)
            AND width IS NOT NULL 
            AND height IS NOT NULL
          ORDER BY id
        `;
      
      const hqImages = limitValue 
        ? await client.query(query, [limitValue])
        : await client.query(query);

      let processed = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      // Process in batches
      const BATCH_SIZE = 10;
      for (let i = 0; i < hqImages.rows.length; i += BATCH_SIZE) {
        const batch = hqImages.rows.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (row: any) => {
          try {
            processed++;
            const longSide = Math.max(row.width, row.height);
            
            // Skip if sz already exists and is a valid number > 0
            // Handle sz as either integer or varchar
            const szValue = row.sz;
            const szNumber = typeof szValue === 'string' 
              ? (szValue.match(/^\d+$/) ? parseInt(szValue, 10) : null)
              : (typeof szValue === 'number' ? szValue : null);
            
            if (szNumber && szNumber > 0) {
              skipped++;
              
              // Still update description if missing
              if (!row.description) {
                const description = formatImageDescription(row.width, row.height, szNumber);
                await client.query(
                  `UPDATE images SET description = $1 WHERE id = $2`,
                  [description, row.id]
                );
              }
              return;
            }

            // Try to fetch from Supabase storage
            let fileBuffer: Buffer | null = null;
            const pathStr = String(row.path || '');
            
            // HQ images (mytp=5) should be in images_raw bucket
            // Use client method first (works for both public and private buckets)
            fileBuffer = await fetchFromStorageWithClient(row.path, 'images_raw');
            
            // If not found in images_raw, try glamourgirls_images as fallback
            if (!fileBuffer) {
              fileBuffer = await fetchFromStorageWithClient(row.path, 'glamourgirls_images');
            }

            if (!fileBuffer) {
              errors++;
              errorDetails.push(`Image ID ${row.id}: Could not fetch from storage (path: ${pathStr})`);
              console.error(`Failed to fetch image ${row.id} from any bucket. Path: ${pathStr}`);
              return;
            }

            const fileSizeBytes = fileBuffer.length;
            
            // Update sz column
            await client.query(
              `UPDATE images SET sz = $1 WHERE id = $2`,
              [fileSizeBytes, row.id]
            );

            // Update description column
            const description = formatImageDescription(row.width, row.height, fileSizeBytes);
            await client.query(
              `UPDATE images SET description = $1 WHERE id = $2`,
              [description, row.id]
            );

            updated++;
            
          } catch (error: any) {
            errors++;
            errorDetails.push(`Image ID ${row.id}: ${error.message}`);
          }
        }));

        // Small delay between batches
        if (i + BATCH_SIZE < hqImages.rows.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const limitInfo = limit ? ` (limited to ${limit} images for testing)` : '';
      return NextResponse.json({
        success: true,
        message: `Processed ${processed} images: ${updated} updated, ${skipped} skipped, ${errors} errors${limitInfo}`,
        processed,
        updated,
        skipped,
        errors,
        errorDetails: errorDetails.slice(0, 20), // Limit error details
        limit: limit || null,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error calculating HQ file sizes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate file sizes' },
      { status: 500 }
    );
  }
}

