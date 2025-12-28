/**
 * Script to fix headshots for "Their Man" entries
 * - Deletes wrong headshots from local folders
 * - Creates placeholder dummy images for "Their Man" entries that don't have second GIF
 * 
 * Usage: tsx scripts/fix-their-man-headshots.ts [--dry-run]
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs/promises';
import pool from '@/lib/db';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const TARGET_WIDTH = 190;
const TARGET_HEIGHT = 245;

async function createPlaceholderHeadshot(actressId: number, folderName: string, supabase: any): Promise<boolean> {
  try {
    // Create a simple gray placeholder image
    const placeholder = sharp({
      create: {
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }
      }
    });

    const placeholderBuffer = await placeholder
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload placeholder to Supabase
    const storagePath = `${folderName}/${actressId}/headshot.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('glamourgirls_images')
      .upload(storagePath, placeholderBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error(`  Upload error: ${uploadError.message}`);
      return false;
    }

    // Update database
    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;
    await pool.execute(
      `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
      [actressId]
    );

    await pool.execute(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
       VALUES (?, ?, ?, ?, 3, ?, ?)`,
      [
        actressId,
        dbPath,
        TARGET_WIDTH,
        TARGET_HEIGHT,
        'image/jpeg',
        placeholderBuffer.length
      ]
    );

    return true;
  } catch (error: any) {
    console.error(`  Error creating placeholder: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log('Finding "Their Man" entries with headshots...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all "Their Man" entries with headshots
    const [results] = await pool.execute(`
      SELECT DISTINCT g.id, g.nm as name
      FROM girls g
      INNER JOIN images i ON i.girlid = g.id
      WHERE g.published = 2
        AND g.theirman = true
        AND i.path IS NOT NULL 
        AND i.path != ''
        AND (
          i.path ILIKE '%headshot.jpg%' 
          OR i.path ILIKE '%headshot.jpeg%'
          OR i.path ILIKE '%headshot.png%'
          OR i.mytp = 3
        )
      ORDER BY g.id
    `) as any[];

    const theirMen = Array.isArray(results) ? results : [];
    console.log(`Found ${theirMen.length} "Their Man" entries with headshots\n`);

    let processed = 0;
    let deleted = 0;
    let placeholderCreated = 0;
    let failed = 0;

    for (const entry of theirMen) {
      const entryId = Number(entry.id);
      const name = String(entry.name || '');

      processed++;
      console.log(`[${processed}/${theirMen.length}] [${entryId}] ${name}`);

      // Check if they have a second GIF
      let hasSecondGif = false;
      let folderName = 'securepic';

      for (const folder of ['securepic', 'newpic']) {
        const { data: files } = await supabase.storage
          .from('glamourgirls_images')
          .list(`${folder}/${entryId}`, { limit: 100 });

        if (files) {
          const gifFiles = files
            .filter(f => f.name.toLowerCase().endsWith('.gif'))
            .sort((a, b) => {
              const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
              const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
              return numA - numB;
            });

          if (gifFiles.length >= 2) {
            hasSecondGif = true;
            folderName = folder;
            break;
          } else if (gifFiles.length > 0) {
            folderName = folder;
          }
        }
      }

      if (hasSecondGif) {
        console.log(`  ⊘ Has second GIF - will be handled by main fix script`);
        continue;
      }

      // No second GIF - delete wrong headshot and create placeholder
      if (dryRun) {
        console.log(`  DRY RUN: Would delete wrong headshot and create placeholder`);
        deleted++;
        placeholderCreated++;
        continue;
      }

      // Delete from Supabase
      const headshotPath = `${folderName}/${entryId}/headshot.jpg`;
      await supabase.storage
        .from('glamourgirls_images')
        .remove([headshotPath]);

      // Delete from local old folders
      const oldSecurepicPath = `/Users/borislavbojkov/dev/gg_old_securepic/${entryId}/headshot.jpg`;
      const oldNewpicPath = `/Users/borislavbojkov/dev/gg_old_newpic/${entryId}/headshot.jpg`;
      
      try {
        await fs.unlink(oldSecurepicPath);
        console.log(`  ✓ Deleted: ${oldSecurepicPath}`);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.log(`  ⚠️  Could not delete ${oldSecurepicPath}: ${err.message}`);
        }
      }
      
      try {
        await fs.unlink(oldNewpicPath);
        console.log(`  ✓ Deleted: ${oldNewpicPath}`);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.log(`  ⚠️  Could not delete ${oldNewpicPath}: ${err.message}`);
        }
      }

      // Delete from database
      await pool.execute(
        `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
        [entryId]
      );

      // Create placeholder
      const placeholderCreated_result = await createPlaceholderHeadshot(entryId, folderName, supabase);
      
      if (placeholderCreated_result) {
        deleted++;
        placeholderCreated++;
        console.log(`  ✓ Created placeholder dummy headshot`);
      } else {
        failed++;
        console.log(`  ✗ Failed to create placeholder`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total "Their Man" entries checked: ${theirMen.length}`);
    console.log(`✓ Deleted wrong headshots: ${deleted}`);
    console.log(`✓ Created placeholder dummies: ${placeholderCreated}`);
    console.log(`✗ Failed: ${failed}`);

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();



