import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

/**
 * Script to create headshots for "Their Men" entries
 * - Finds entries with theirman = true that don't have headshots
 * - Looks in gg_old_newpic and gg_old_securepic for the second .gif file
 * - Crops: top 30px, right 30px, left 25px, bottom 25px
 * - Converts to JPEG headshot
 * - Uploads to Supabase Storage
 * - Updates database
 */

interface ProcessResult {
  actressId: number;
  name: string;
  success: boolean;
  message: string;
  skipped?: boolean;
}

async function uploadToSupabase(
  supabase: any,
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(cleanPath, buffer, {
      contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return cleanPath;
}

async function processHeadshotForTheirMan(actressId: number, name: string): Promise<ProcessResult> {
  try {
    // Check if headshot already exists in database
    const [existingHeadshot] = await pool.execute(
      `SELECT id FROM images 
       WHERE girlid = ? 
         AND path IS NOT NULL 
         AND path != ''
         AND (
           path ILIKE '%headshot.jpg' 
           OR path ILIKE '%headshot.jpeg'
           OR path ILIKE '%headshot.png'
         )
       LIMIT 1`,
      [actressId]
    ) as any[];

    if (Array.isArray(existingHeadshot) && existingHeadshot.length > 0) {
      return {
        actressId,
        name,
        success: true,
        message: 'Headshot already exists, skipping',
        skipped: true,
      };
    }

    // Look in old directories: gg_old_newpic and gg_old_securepic
    const oldDirs = [
      path.join('/Users/borislavbojkov/dev/gg_old_newpic', actressId.toString()),
      path.join('/Users/borislavbojkov/dev/gg_old_securepic', actressId.toString()),
    ];

    let actressFolder: string | null = null;
    let folderName: string | null = null;

    // Find which folder exists
    for (const folder of oldDirs) {
      try {
        await fs.access(folder);
        actressFolder = folder;
        // Determine folder name for Supabase path
        if (folder.includes('securepic')) {
          folderName = 'securepic';
        } else {
          folderName = 'newpic';
        }
        break;
      } catch {
        continue;
      }
    }

    if (!actressFolder || !folderName) {
      return {
        actressId,
        name,
        success: false,
        message: `Folder not found in old directories for ${actressId}`,
      };
    }

    // List all files in the folder
    const files = await fs.readdir(actressFolder);

    // Filter for GIF files and sort them
    const gifFiles = files
      .filter(f => f.toLowerCase().endsWith('.gif'))
      .sort((a, b) => {
        // Sort by filename (numeric if possible)
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });

    if (gifFiles.length === 0) {
      return {
        actressId,
        name,
        success: false,
        message: `No GIF files found`,
      };
    }

    // Get the second GIF file if available, otherwise use the first
    const gifFile = gifFiles.length >= 2 ? gifFiles[1] : gifFiles[0];
    const sourceImagePath = path.join(actressFolder, gifFile);

    console.log(`  Processing ${actressId} (${name}): Using ${gifFile} (${gifFiles.length >= 2 ? 'second' : 'first'} GIF)`);

    // Read the image
    const imageBuffer = await fs.readFile(sourceImagePath);
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        actressId,
        name,
        success: false,
        message: `Invalid image dimensions`,
      };
    }

    // Crop parameters: top 30px, right 30px, left 25px, bottom 25px
    const cropLeft = 25;
    const cropTop = 30;
    const cropRight = 30;
    const cropBottom = 25;

    const cropWidth = metadata.width - cropLeft - cropRight;
    const cropHeight = metadata.height - cropTop - cropBottom;

    // Validate crop dimensions
    if (cropWidth <= 0 || cropHeight <= 0 || 
        cropLeft + cropWidth > metadata.width || 
        cropTop + cropHeight > metadata.height) {
      return {
        actressId,
        name,
        success: false,
        message: `Invalid crop dimensions: ${metadata.width}x${metadata.height} -> ${cropWidth}x${cropHeight}`,
      };
    }

    // Crop and convert to JPEG
    const processedImage = await sharp(imageBuffer)
      .extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const processedMetadata = await sharp(processedImage).metadata();

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        actressId,
        name,
        success: false,
        message: 'Supabase configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upload to Supabase Storage
    const headshotPath = `${folderName}/${actressId}/headshot.jpg`;

    try {
      await uploadToSupabase(supabase, 'glamourgirls_images', headshotPath, processedImage, 'image/jpeg');
    } catch (uploadError: any) {
      return {
        actressId,
        name,
        success: false,
        message: `Failed to upload to Supabase: ${uploadError.message}`,
      };
    }

    // Insert or update headshot record in database
    try {
      const [existing] = await pool.execute(
        `SELECT id FROM images WHERE girlid = ? AND (path LIKE '%headshot.jpg%' OR path LIKE '%headshot.jpeg%') LIMIT 1`,
        [actressId]
      ) as any[];

      if (Array.isArray(existing) && existing.length > 0) {
        // Update existing
        await pool.execute(
          `UPDATE images 
           SET width = ?, height = ?, path = ?, sz = ?
           WHERE id = ?`,
          [
            processedMetadata.width,
            processedMetadata.height,
            `/${headshotPath}`,
            processedImage.length,
            existing[0].id,
          ]
        );
      } else {
        // Insert new - use mytp = 3 for thumbnails/headshots
        await pool.execute(
          `INSERT INTO images (girlid, path, width, height, mytp, sz)
           VALUES (?, ?, ?, ?, 3, ?)`,
          [
            actressId,
            `/${headshotPath}`,
            processedMetadata.width || 0,
            processedMetadata.height || 0,
            processedImage.length,
          ]
        );
      }
    } catch (dbError) {
      console.error(`  ⚠️  Database error for ${actressId}:`, dbError);
      // Continue anyway, the file is uploaded
    }

    return {
      actressId,
      name,
      success: true,
      message: `Headshot created: ${processedMetadata.width}x${processedMetadata.height}px`,
    };
  } catch (error: any) {
    return {
      actressId,
      name,
      success: false,
      message: error.message || 'Unknown error',
    };
  }
}

async function main() {
  console.log('🔍 Finding "Their Men" entries without headshots...\n');
  
  // Get all "Their Men" entries that don't have headshots
  const [theirMenEntries] = await pool.execute(
    `SELECT g.id, g.nm, g.firstname, g.familiq
     FROM girls g
     WHERE g.published = 2
       AND g.theirman = true
       AND NOT EXISTS (
         SELECT 1 FROM images i
         WHERE i.girlid = g.id
           AND i.path IS NOT NULL
           AND i.path != ''
           AND (
             i.path ILIKE '%headshot.jpg'
             OR i.path ILIKE '%headshot.jpeg'
             OR i.path ILIKE '%headshot.png'
           )
       )
     ORDER BY g.id ASC`
  ) as any[];

  const entries = Array.isArray(theirMenEntries) ? theirMenEntries : [];
  
  if (entries.length === 0) {
    console.log('✅ All "Their Men" entries already have headshots!');
    process.exit(0);
  }

  console.log(`Found ${entries.length} "Their Men" entries without headshots\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: number; name: string; message: string }> = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const actressId = Number(entry.id);
    const name = `${entry.firstname || ''} ${entry.familiq || ''}`.trim() || entry.nm || `ID ${actressId}`;
    const progress = `[${i + 1}/${entries.length}]`;

    process.stdout.write(`${progress} Processing ${actressId} (${name})...`);

    const result = await processHeadshotForTheirMan(actressId, name);

    if (result.success) {
      if (result.skipped) {
        skippedCount++;
        console.log(` ✓ SKIPPED: ${result.message}`);
      } else {
        successCount++;
        console.log(` ✓ SUCCESS: ${result.message}`);
      }
    } else {
      errorCount++;
      errors.push({ id: actressId, name, message: result.message });
      console.log(` ✗ ERROR: ${result.message}`);
    }
  }

  console.log(`\n\n📊 SUMMARY`);
  console.log('='.repeat(80));
  console.log(`Total processed: ${entries.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped (already exists): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS:`);
    errors.forEach(err => {
      console.log(`  ID ${err.id} (${err.name}): ${err.message}`);
    });
  }

  console.log('\n✅ Done!');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

