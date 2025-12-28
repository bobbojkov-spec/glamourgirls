/**
 * Repair script to find and clean orphaned HQ images
 * 
 * Orphaned HQ images are HQ images (mytp=5) that don't have a matching gallery image (mytp=4)
 * This can happen when gallery images are deleted but HQ images remain.
 * 
 * Usage:
 *   npm run ts-node scripts/repair-orphaned-hq-images.ts [--dry-run] [--delete]
 * 
 * Options:
 *   --dry-run: Only list orphaned images, don't delete anything
 *   --delete: Delete orphaned images from database and Supabase storage
 */

import pool from '../src/lib/db';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Delete a file from Supabase Storage
 */
async function deleteFromSupabaseStorage(
  supabase: any,
  storagePath: string,
  bucket: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([cleanPath]);

    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return { success: true }; // Already deleted
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Find orphaned HQ images (HQ images without matching gallery images)
 */
async function findOrphanedHQImages(pool: any): Promise<any[]> {
    const query = `
      SELECT 
        hq.id,
        hq.girlid,
        hq.path,
        hq.width,
        hq.height,
        g.nm as actress_name
      FROM images hq
      JOIN girls g ON hq.girlid = g.id
      WHERE hq.mytp = 5
        AND NOT EXISTS (
          SELECT 1 
          FROM images gallery
          WHERE gallery.girlid = hq.girlid
            AND gallery.mytp = 4
            AND (gallery.id = hq.id - 1 OR gallery.id = hq.id + 1)
        )
      ORDER BY hq.girlid, hq.id
    `;

    const [rows] = await pool.execute(query);
    return Array.isArray(rows) ? rows : [];
}

/**
 * Prompt user for confirmation
 */
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const shouldDelete = args.includes('--delete');

  console.log('🔍 Repair Orphaned HQ Images\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : shouldDelete ? 'DELETE (will delete orphaned images)' : 'LIST ONLY (use --delete to actually delete)'}\n`);

  let supabase: any = null;

  try {
    // Find orphaned HQ images
    console.log('Searching for orphaned HQ images...');
    const orphanedImages = await findOrphanedHQImages(pool);

    if (orphanedImages.length === 0) {
      console.log('✅ No orphaned HQ images found!');
      return;
    }

    console.log(`\n⚠️  Found ${orphanedImages.length} orphaned HQ image(s):\n`);

    // Group by actress
    const byActress = new Map<number, any[]>();
    for (const img of orphanedImages) {
      const girlId = Number(img.girlid);
      if (!byActress.has(girlId)) {
        byActress.set(girlId, []);
      }
      byActress.get(girlId)!.push(img);
    }

    // Display results
    for (const [girlId, images] of byActress.entries()) {
      const actressName = images[0].actress_name;
      console.log(`  Actress ID ${girlId}: ${actressName}`);
      for (const img of images) {
        console.log(`    - HQ Image ID ${img.id}: ${img.path} (${img.width}×${img.height}px)`);
      }
    }

    if (isDryRun) {
      console.log('\n✅ Dry run complete. No changes made.');
      return;
    }

    if (!shouldDelete) {
      console.log('\n💡 To delete these orphaned images, run with --delete flag:');
      console.log('   npm run ts-node scripts/repair-orphaned-hq-images.ts --delete');
      return;
    }

    // Confirm deletion
    console.log(`\n⚠️  WARNING: This will delete ${orphanedImages.length} orphaned HQ image(s) from:`);
    console.log('   - Database (images table)');
    console.log('   - Supabase Storage (images_raw bucket)');
    
    const answer = await askQuestion('\nAre you sure you want to proceed? (yes/no): ');
    
    if (answer !== 'yes' && answer !== 'y') {
      console.log('❌ Deletion cancelled.');
      return;
    }

    // Initialize Supabase client
    supabase = getSupabaseClient();

    // Delete orphaned images
    console.log('\n🗑️  Deleting orphaned HQ images...\n');
    
    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const img of orphanedImages) {
      try {
        const imageId = Number(img.id);
        const imagePath = img.path;

        // Delete from Supabase Storage
        if (imagePath) {
          const storageResult = await deleteFromSupabaseStorage(supabase, imagePath, 'images_raw');
          if (!storageResult.success) {
            errors.push(`Image ID ${imageId}: Failed to delete from storage: ${storageResult.error}`);
            console.log(`  ⚠️  Image ID ${imageId}: Storage deletion failed (${storageResult.error}), but continuing...`);
          } else {
            console.log(`  ✓ Image ID ${imageId}: Deleted from storage`);
          }
        }

        // Delete from database
        await pool.execute('DELETE FROM images WHERE id = ?', [imageId]);
        console.log(`  ✓ Image ID ${imageId}: Deleted from database`);
        
        deletedCount++;
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Image ID ${img.id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`  ❌ ${errorMsg}`);
      }
    }

    // Summary
    console.log(`\n📊 Summary:`);
    console.log(`   Deleted: ${deletedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      for (const error of errors) {
        console.log(`   - ${error}`);
      }
    }

    if (deletedCount > 0) {
      console.log(`\n✅ Successfully deleted ${deletedCount} orphaned HQ image(s)!`);
    }
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

