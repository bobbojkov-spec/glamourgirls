/**
 * Script to calculate and store file sizes (in bytes) for HQ images
 * Only for images where longer side > 1200px
 * 
 * This script:
 * 1. Finds all HQ images (mytp = 5) where long side > 1200px
 * 2. For images missing sz (file size), fetches from Supabase storage and calculates size
 * 3. Updates the sz column in the database
 * 4. Updates the description column with formatted dimensions and file size
 * 
 * Usage: 
 *   Normal mode: tsx scripts/calculate-hq-file-sizes.ts
 *   Test mode (specific images): TEST_IMAGE_IDS="123,456" tsx scripts/calculate-hq-file-sizes.ts
 * 
 * To interrupt and cleanup: Press Ctrl+C, then run scripts/cleanup-hq-file-sizes.ts
 */

import { getPool } from '../src/lib/db';
import { fetchFromStorageWithClient } from '../src/lib/supabase/storage';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Test mode: specify image IDs to test with (comma-separated)
// Usage: TEST_IMAGE_IDS="123,456" tsx scripts/calculate-hq-file-sizes.ts
const TEST_IMAGE_IDS = process.env.TEST_IMAGE_IDS 
  ? process.env.TEST_IMAGE_IDS.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
  : null;

// Helper function to format image description
function formatImageDescription(width: number, height: number, fileSizeBytes: number): string {
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  return `${width} × ${height} px (${fileSizeMB} MB)`;
}

async function calculateFileSizes() {
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    if (TEST_IMAGE_IDS && TEST_IMAGE_IDS.length > 0) {
      console.log(`🧪 TEST MODE: Processing ${TEST_IMAGE_IDS.length} specific image(s): ${TEST_IMAGE_IDS.join(', ')}\n`);
    } else {
      console.log('🔍 Finding HQ images (mytp = 5) where long side > 1200px...\n');
    }
    
    // Get HQ images - either test mode or all matching criteria
    let query = `
      SELECT id, girlid, path, width, height, sz, description, mytp
      FROM images
      WHERE mytp = 5
        AND width IS NOT NULL 
        AND height IS NOT NULL
    `;
    
    const queryParams: any[] = [];
    
    if (TEST_IMAGE_IDS && TEST_IMAGE_IDS.length > 0) {
      // Test mode: only get specific image IDs
      query += ` AND id = ANY($1::int[])`;
      queryParams.push(TEST_IMAGE_IDS);
    } else {
      // Normal mode: only images where long side > 1200px
      query += ` AND (width > 1200 OR height > 1200)`;
    }
    
    query += ` ORDER BY id`;
    
    const hqImages = await client.query(query, queryParams);

    console.log(`Found ${hqImages.rows.length} HQ image(s) to process\n`);

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches to avoid overwhelming the system
    const BATCH_SIZE = 10;
    for (let i = 0; i < hqImages.rows.length; i += BATCH_SIZE) {
      const batch = hqImages.rows.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (row: any) => {
        try {
          processed++;
          const longSide = Math.max(row.width, row.height);
          
          // Skip if sz already exists
          if (row.sz && row.sz > 0) {
            skipped++;
            console.log(`[${processed}/${hqImages.rows.length}] Image ID ${row.id}: sz already exists (${(row.sz / (1024 * 1024)).toFixed(2)} MB), skipping`);
            
            // Still update description if missing
            if (!row.description) {
              const description = formatImageDescription(row.width, row.height, row.sz);
              await client.query(
                `UPDATE images SET description = $1 WHERE id = $2`,
                [description, row.id]
              );
              console.log(`  → Updated description: ${description}`);
            }
            return;
          }

          console.log(`[${processed}/${hqImages.rows.length}] Processing Image ID ${row.id} (Girl ${row.girlid}): ${row.width} × ${row.height} px`);
          console.log(`  📁 Path: ${row.path}`);
          
          if (!row.path) {
            console.error(`  ❌ No path found for image ID ${row.id}`);
            errors++;
            return;
          }
          
          // Try to fetch from Supabase storage
          // HQ images are typically in 'images_raw' bucket (private), but may also be in 'glamourgirls_images' (public)
          let fileBuffer: Buffer | null = null;
          
          // Try images_raw bucket first (HQ images - private bucket, use client method)
          console.log(`  🔍 Trying images_raw bucket...`);
          fileBuffer = await fetchFromStorageWithClient(row.path, 'images_raw');
          
          // If not found, try glamourgirls_images bucket (public bucket)
          if (!fileBuffer) {
            console.log(`  🔍 Trying glamourgirls_images bucket...`);
            fileBuffer = await fetchFromStorageWithClient(row.path, 'glamourgirls_images');
          }

          if (!fileBuffer) {
            console.error(`  ❌ Could not fetch image from storage: ${row.path}`);
            console.error(`     Tried buckets: images_raw, glamourgirls_images`);
            errors++;
            return;
          }
          
          console.log(`  ✅ Successfully fetched image (${fileBuffer.length} bytes)`);

          const fileSizeBytes = fileBuffer.length;
          const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
          
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
          console.log(`  ✅ Updated: sz = ${fileSizeBytes} bytes (${fileSizeMB} MB), description = "${description}"`);
          
        } catch (error: any) {
          console.error(`  ❌ Error processing Image ID ${row.id}:`, error.message);
          errors++;
        }
      }));

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < hqImages.rows.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n✅ Processing complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already had sz): ${skipped}`);
    console.log(`   Errors: ${errors}`);

    // Show some examples
    const examples = await client.query(`
      SELECT id, girlid, width, height, sz, description, mytp
      FROM images
      WHERE mytp = 5
        AND (width > 1200 OR height > 1200)
        AND sz IS NOT NULL
        AND description IS NOT NULL
      ORDER BY id DESC
      LIMIT 5
    `);

    if (examples.rows.length > 0) {
      console.log('\n📋 Example updated records:');
      examples.rows.forEach((row: any) => {
        const fileSizeMB = row.sz ? (row.sz / (1024 * 1024)).toFixed(2) : 'N/A';
        console.log(`  Image ID ${row.id} (Girl ${row.girlid}): ${row.description} (sz: ${fileSizeMB} MB)`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n⚠️  If you interrupted the script, run: tsx scripts/cleanup-hq-file-sizes.ts');
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

// Handle interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted!');
  console.log('⚠️  Run cleanup script: tsx scripts/cleanup-hq-file-sizes.ts');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Script terminated!');
  console.log('⚠️  Run cleanup script: tsx scripts/cleanup-hq-file-sizes.ts');
  process.exit(1);
});

calculateFileSizes().catch(console.error);

