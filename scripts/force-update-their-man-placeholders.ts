/**
 * Force update placeholder headshots for "Their Man" entries in Supabase bucket
 * This ensures the dummy images are actually uploaded and replace any old images
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

async function forceUploadPlaceholder(actressId: number, folderName: string, supabase: any): Promise<boolean> {
  try {
    console.log(`  Creating placeholder image...`);
    
    // Create a proper gray placeholder image with actual content
    // Generate a simple pattern to ensure proper JPEG encoding (not just solid color)
    const svgPattern = Buffer.from(`<svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgb(180,180,180)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" fill="rgb(240,240,240)"/>
      <rect width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" fill="url(#grid)"/>
    </svg>`);

    const placeholderBuffer = await sharp(svgPattern)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    console.log(`  Generated placeholder: ${placeholderBuffer.length} bytes`);

    // Delete existing file first to ensure clean upload
    const storagePath = `${folderName}/${actressId}/headshot.jpg`;
    console.log(`  Deleting existing file: ${storagePath}`);
    await supabase.storage
      .from('glamourgirls_images')
      .remove([storagePath]);

    // Wait a moment for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Upload placeholder to Supabase with upsert
    console.log(`  Uploading placeholder to: ${storagePath}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('glamourgirls_images')
      .upload(storagePath, placeholderBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: 'no-cache',
      });

    if (uploadError) {
      console.error(`  ✗ Upload error: ${uploadError.message}`);
      return false;
    }

    console.log(`  ✓ Upload successful`);

    // Verify the upload by downloading it back
    const { data: verifyData, error: verifyError } = await supabase.storage
      .from('glamourgirls_images')
      .download(storagePath);

    if (verifyError || !verifyData) {
      console.error(`  ✗ Verification failed: ${verifyError?.message || 'Unknown'}`);
      return false;
    }

    const verifyBuffer = await verifyData.arrayBuffer();
    console.log(`  ✓ Verified: ${verifyBuffer.byteLength} bytes in bucket`);

    // Update database
    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;
    console.log(`  Updating database: ${dbPath}`);
    
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

    console.log(`  ✓ Database updated`);
    return true;
  } catch (error: any) {
    console.error(`  ✗ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Force updating "Their Man" placeholder headshots in Supabase bucket...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all "Their Man" entries
    const [results] = await pool.execute(`
      SELECT DISTINCT g.id, g.nm as name
      FROM girls g
      WHERE g.published = 2
        AND g.theirman = true
      ORDER BY g.id
    `) as any[];

    const theirMen = Array.isArray(results) ? results : [];
    console.log(`Found ${theirMen.length} "Their Man" entries\n`);

    let processed = 0;
    let success = 0;
    let failed = 0;

    for (const entry of theirMen) {
      const entryId = Number(entry.id);
      const name = String(entry.name || '');

      processed++;
      console.log(`[${processed}/${theirMen.length}] [${entryId}] ${name}`);

      // Check if they have a second GIF (real headshot)
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
        console.log(`  ⊘ Has second GIF - skipping (will use real headshot)`);
        continue;
      }

      // No second GIF - force upload placeholder
      const result = await forceUploadPlaceholder(entryId, folderName, supabase);
      
      if (result) {
        success++;
        console.log(`  ✓ SUCCESS\n`);
      } else {
        failed++;
        console.log(`  ✗ FAILED\n`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total "Their Man" entries: ${theirMen.length}`);
    console.log(`✓ Placeholders uploaded: ${success}`);
    console.log(`✗ Failed: ${failed}`);
    console.log(`⊘ Skipped (have second GIF): ${theirMen.length - success - failed}`);

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

