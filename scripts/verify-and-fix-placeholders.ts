/**
 * Verify placeholder headshots for "Their Man" entries and fix any that are too small
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import pool from '@/lib/db';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const TARGET_WIDTH = 190;
const TARGET_HEIGHT = 245;
const MIN_FILE_SIZE = 5000; // Minimum 5KB for a valid JPEG

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
  console.log('Checking "Their Man" placeholder headshots...\n');

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
      SELECT DISTINCT g.id, g.nm as name, i.path
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

    let checked = 0;
    let fixed = 0;
    let failed = 0;

    for (const entry of theirMen) {
      const entryId = Number(entry.id);
      const name = String(entry.name || '');
      const dbPath = String(entry.path || '');

      checked++;
      console.log(`[${checked}/${theirMen.length}] [${entryId}] ${name}`);

      // Extract folder name from path
      const folderMatch = dbPath.match(/\/(securepic|newpic)\//);
      const folderName = folderMatch ? folderMatch[1] : 'securepic';
      const storagePath = `${folderName}/${entryId}/headshot.jpg`;

      // Check file size in Supabase
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('glamourgirls_images')
        .download(storagePath);

      if (downloadError || !fileData) {
        console.log(`  ✗ File not found or error: ${downloadError?.message || 'Unknown'}`);
        // Recreate placeholder
        const created = await createPlaceholderHeadshot(entryId, folderName, supabase);
        if (created) {
          fixed++;
          console.log(`  ✓ Recreated placeholder`);
        } else {
          failed++;
          console.log(`  ✗ Failed to recreate`);
        }
        continue;
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const fileSize = arrayBuffer.byteLength;

      if (fileSize < MIN_FILE_SIZE) {
        console.log(`  ⚠️  File too small: ${fileSize} bytes (minimum: ${MIN_FILE_SIZE})`);
        // Recreate placeholder
        const created = await createPlaceholderHeadshot(entryId, folderName, supabase);
        if (created) {
          fixed++;
          console.log(`  ✓ Recreated placeholder`);
        } else {
          failed++;
          console.log(`  ✗ Failed to recreate`);
        }
      } else {
        console.log(`  ✓ File size OK: ${fileSize} bytes`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total checked: ${theirMen.length}`);
    console.log(`✓ Fixed: ${fixed}`);
    console.log(`✗ Failed: ${failed}`);

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

