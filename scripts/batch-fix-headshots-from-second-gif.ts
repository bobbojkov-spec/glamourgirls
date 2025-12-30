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
 * Batch script to fix headshots for actresses
 * - Finds the second GIF file in the actress folder
 * - Crops: top 30px, right 30px, left 25px, bottom 25px
 * - Converts to JPEG headshot
 * - Uploads to Supabase Storage
 * - Updates database
 */

interface ProcessResult {
  actressId: number;
  success: boolean;
  message: string;
  skipped?: boolean;
}

async function processHeadshotForActress(actressId: number): Promise<ProcessResult> {
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
        success: true,
        message: 'Headshot already exists, skipping',
        skipped: true,
      };
    }

    // Find the actress folder (check both newpic and securepic)
    const baseDir = path.join(process.cwd(), 'public');
    const possibleFolders = [
      path.join(baseDir, 'newpic', actressId.toString()),
      path.join(baseDir, 'securepic', actressId.toString()),
    ];

    let actressFolder: string | null = null;
    let folderName: string | null = null;

    for (const folder of possibleFolders) {
      try {
        await fs.access(folder);
        actressFolder = folder;
        // Determine folder name from path
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
        success: false,
        message: `Folder not found for actress ${actressId}`,
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

    if (gifFiles.length < 2) {
      return {
        actressId,
        success: false,
        message: `Less than 2 GIF files found (found ${gifFiles.length})`,
      };
    }

    // Get the second GIF file (index 1)
    const secondGifFile = gifFiles[1];
    const sourceImagePath = path.join(actressFolder, secondGifFile);

    console.log(`  Processing ${actressId}: Using ${secondGifFile} (second GIF)`);

    // Read the image
    const imageBuffer = await fs.readFile(sourceImagePath);
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        actressId,
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
        success: false,
        message: 'Supabase configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upload to Supabase Storage
    const headshotPath = `${folderName}/${actressId}/headshot.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('glamourgirls_images')
      .upload(headshotPath, processedImage, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      return {
        actressId,
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
            processedMetadata.width,
            processedMetadata.height,
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
      success: true,
      message: `Headshot created: ${processedMetadata.width}x${processedMetadata.height}px`,
    };
  } catch (error: any) {
    return {
      actressId,
      success: false,
      message: error.message || 'Unknown error',
    };
  }
}

async function main() {
  // Get actress IDs from command line arguments or use test IDs
  const args = process.argv.slice(2);
  let actressIds: number[] = [];

  if (args.length > 0 && args[0] !== 'all') {
    // Process specific IDs from command line
    actressIds = args.map(arg => parseInt(arg)).filter(id => !isNaN(id));
  } else if (args[0] === 'all') {
    // Get all actresses using first gallery image as headshot
    console.log('🔍 Finding actresses using first gallery image as headshot...\n');
    
    const [actresses] = await pool.execute(
      `SELECT DISTINCT g.id
       FROM girls g
       WHERE g.published = 2
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

    actressIds = (actresses || []).map((a: any) => a.id);
    console.log(`Found ${actressIds.length} actresses to process\n`);
  } else {
    console.error('Usage:');
    console.error('  tsx scripts/batch-fix-headshots-from-second-gif.ts <id1> [id2] [id3] ...');
    console.error('  tsx scripts/batch-fix-headshots-from-second-gif.ts all');
    process.exit(1);
  }

  if (actressIds.length === 0) {
    console.log('No actresses to process');
    process.exit(0);
  }

  console.log(`🚀 Processing ${actressIds.length} actress(es)...\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: number; message: string }> = [];

  for (let i = 0; i < actressIds.length; i++) {
    const actressId = actressIds[i];
    const progress = `[${i + 1}/${actressIds.length}]`;

    process.stdout.write(`${progress} Processing actress ${actressId}...`);

    const result = await processHeadshotForActress(actressId);

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
      errors.push({ id: actressId, message: result.message });
      console.log(` ✗ ERROR: ${result.message}`);
    }
  }

  console.log(`\n\n📊 SUMMARY`);
  console.log('='.repeat(80));
  console.log(`Total processed: ${actressIds.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped (already exists): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS:`);
    errors.forEach(err => {
      console.log(`  ID ${err.id}: ${err.message}`);
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


