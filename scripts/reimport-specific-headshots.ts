/**
 * Script to reimport headshots for specific actresses from Supabase storage
 * Processes the second GIF file (skips first which is name card)
 * 
 * Usage: tsx scripts/reimport-specific-headshots.ts [actressId1] [actressId2] ...
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface ProcessResult {
  actressId: number;
  folderName: string;
  success: boolean;
  message: string;
}

async function processHeadshotFromSecondGif(actressId: number, supabase: any): Promise<ProcessResult> {
  try {
    // Check if already in database
    const [existing] = await pool.execute(
      `SELECT id FROM images 
       WHERE girlid = ? 
         AND path IS NOT NULL 
         AND path != ''
         AND (
           path ILIKE '%headshot.jpg%' 
           OR path ILIKE '%headshot.jpeg%'
           OR path ILIKE '%headshot.png%'
           OR mytp = 3
         )
       LIMIT 1`,
      [actressId]
    ) as any[];

    if (Array.isArray(existing) && existing.length > 0) {
      return {
        actressId,
        folderName: 'unknown',
        success: false,
        message: 'Already in database',
      };
    }

    // Check both securepic and newpic folders
    for (const folderName of ['securepic', 'newpic']) {
      // List all files in the folder
      const { data: files, error: listError } = await supabase.storage
        .from('glamourgirls_images')
        .list(`${folderName}/${actressId}`, { limit: 100 });

      if (listError || !files || files.length === 0) {
        continue;
      }

      // Filter and sort GIF files
      const gifFiles = files
        .filter(f => f.name.toLowerCase().endsWith('.gif'))
        .sort((a, b) => {
          const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
          if (numA !== numB) return numA - numB;
          return a.name.localeCompare(b.name);
        });

      if (gifFiles.length < 2) {
        continue; // Try next folder
      }

      // Use second GIF (index 1) - skip first which is name card
      const secondGif = gifFiles[1];
      const storagePath = `${folderName}/${actressId}/${secondGif.name}`;
      
      console.log(`  Found second GIF: ${secondGif.name} in ${folderName}`);

      // Download the second GIF
      const { data, error } = await supabase.storage
        .from('glamourgirls_images')
        .download(storagePath);

      if (error || !data) {
        continue; // Try next folder
      }

      // Convert to buffer
      const arrayBuffer = await data.arrayBuffer();
      let imageBuffer = Buffer.from(arrayBuffer);
      let metadata = await sharp(imageBuffer).metadata();

      // Extract first frame if animated GIF
      if (metadata.pages && metadata.pages > 1) {
        imageBuffer = await sharp(imageBuffer, { page: 0 }).toBuffer();
        metadata = await sharp(imageBuffer).metadata();
      }

      // Process GIF: crop and resize to headshot dimensions (190×245px)
      const TARGET_WIDTH = 190;
      const TARGET_HEIGHT = 245;
      
      // Crop: top 30px, right 30px, left 25px, bottom 25px
      const cropLeft = 25;
      const cropTop = 30;
      const cropRight = 30;
      const cropBottom = 25;

      if (!metadata.width || !metadata.height) {
        return {
          actressId,
          folderName,
          success: false,
          message: 'Invalid image dimensions',
        };
      }

      const cropWidth = metadata.width - cropLeft - cropRight;
      const cropHeight = metadata.height - cropTop - cropBottom;

      if (cropWidth <= 0 || cropHeight <= 0) {
        return {
          actressId,
          folderName,
          success: false,
          message: `Invalid crop dimensions: ${metadata.width}x${metadata.height}`,
        };
      }

      console.log(`  Original: ${metadata.width}×${metadata.height}, cropping...`);

      // Crop the image
      let processedImage = sharp(imageBuffer).extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      });

      // Resize height to TARGET_HEIGHT (maintain aspect ratio)
      processedImage = processedImage.resize(null, TARGET_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: false,
      });

      const resizedBuffer = await processedImage.toBuffer();
      const resizedMeta = await sharp(resizedBuffer).metadata();
      const resizedWidth = resizedMeta.width || TARGET_WIDTH;

      // Crop width to TARGET_WIDTH (centered) if needed
      if (resizedWidth > TARGET_WIDTH) {
        const cropLeftFinal = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
        processedImage = sharp(resizedBuffer).extract({
          left: cropLeftFinal,
          top: 0,
          width: TARGET_WIDTH,
          height: TARGET_HEIGHT,
        });
      } else if (resizedWidth < TARGET_WIDTH) {
        processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'cover',
        });
      }

      // Convert to JPEG
      const headshotBuffer = await processedImage
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      
      const finalMetadata = await sharp(headshotBuffer).metadata();
      console.log(`  Final: ${finalMetadata.width}×${finalMetadata.height}px`);

      // Upload processed headshot to Supabase (as headshot.jpg)
      const headshotStoragePath = `${folderName}/${actressId}/headshot.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('glamourgirls_images')
        .upload(headshotStoragePath, headshotBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        return {
          actressId,
          folderName,
          success: false,
          message: `Upload error: ${uploadError.message}`,
        };
      }

      // Insert into database
      const dbPath = `/${folderName}/${actressId}/headshot.jpg`;
      
      // Delete any existing headshot entries for this actress
      await pool.execute(
        `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
        [actressId]
      );

      // Insert new headshot (mytp = 3 for thumbnails)
      await pool.execute(
        `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
         VALUES (?, ?, ?, ?, 3, ?, ?)`,
        [
          actressId,
          dbPath,
          finalMetadata.width,
          finalMetadata.height,
          'image/jpeg',
          headshotBuffer.length
        ]
      );

      return {
        actressId,
        folderName,
        success: true,
        message: `Processed from ${secondGif.name}, added: ${finalMetadata.width}×${finalMetadata.height}px`,
      };
    }

    return {
      actressId,
      folderName: 'unknown',
      success: false,
      message: 'No second GIF found in securepic or newpic folders',
    };
  } catch (error: any) {
    return {
      actressId,
      folderName: 'unknown',
      success: false,
      message: error?.message || 'Unknown error',
    };
  }
}

async function main() {
  const actressIds = process.argv.slice(2).map(id => parseInt(id)).filter(id => !isNaN(id));

  if (actressIds.length === 0) {
    console.error('Usage: tsx scripts/reimport-specific-headshots.ts [actressId1] [actressId2] ...');
    console.error('Example: tsx scripts/reimport-specific-headshots.ts 459 473 402');
    process.exit(1);
  }

  console.log(`🔍 Processing headshots for ${actressIds.length} actresses from second GIF files...\n`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const results: ProcessResult[] = [];

    for (const actressId of actressIds) {
      console.log(`\n[${actressId}] Processing...`);
      const result = await processHeadshotFromSecondGif(actressId, supabase);
      results.push(result);

      if (result.success) {
        console.log(`  ✓ ${result.message}`);
      } else {
        console.log(`  ✗ ${result.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`✓ Success: ${successful}`);
    console.log(`✗ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  [${r.actressId}]: ${r.message}`);
      });
    }

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

