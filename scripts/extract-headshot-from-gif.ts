/**
 * Script to extract headshot from GIF and process it
 * Usage: tsx scripts/extract-headshot-from-gif.ts <actressId> <gifPath>
 * Example: tsx scripts/extract-headshot-from-gif.ts 729 gg26_old_secure/729/11140.gif
 */

import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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

async function extractHeadshotFromGif(actressId: number, gifPath: string) {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    // Read GIF file - check if it's relative to old folder or absolute
    let fullPath: string;
    if (path.isAbsolute(gifPath)) {
      fullPath = gifPath;
    } else if (gifPath.startsWith('gg26_old_secure/')) {
      // Relative to project root with old folder prefix
      fullPath = path.join(process.cwd(), '..', gifPath);
    } else {
      fullPath = path.join(process.cwd(), gifPath);
    }
    
    // Also try the standard old folder location
    if (!require('fs').existsSync(fullPath)) {
      const oldFolderPath = `/Users/borislavbojkov/dev/gg26_old_secure/${actressId}/${path.basename(gifPath)}`;
      if (require('fs').existsSync(oldFolderPath)) {
        fullPath = oldFolderPath;
      }
    }
    
    console.log(`Reading GIF from: ${fullPath}`);
    
    const buffer = await readFile(fullPath);
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      console.error(`Invalid GIF dimensions: ${fullPath}`);
      process.exit(1);
    }

    console.log(`Original GIF dimensions: ${metadata.width} × ${metadata.height}`);
    console.log(`Frames: ${metadata.pages || 1}`);

    // Extract first frame if animated GIF
    let imageBuffer = buffer;
    if (metadata.pages && metadata.pages > 1) {
      console.log(`Extracting first frame from animated GIF...`);
      imageBuffer = await sharp(buffer, { page: 0 }).toBuffer();
    }

    // Get dimensions after frame extraction
    const frameMeta = await sharp(imageBuffer).metadata();
    console.log(`Frame dimensions: ${frameMeta.width} × ${frameMeta.height}`);

    // Crop: 30px from top and right, 25px from left and bottom
    const cropTop = 30;
    const cropRight = 30;
    const cropLeft = 25;
    const cropBottom = 25;
    
    const originalWidth = frameMeta.width || 0;
    const originalHeight = frameMeta.height || 0;
    
    const cropWidth = originalWidth - cropLeft - cropRight;
    const cropHeight = originalHeight - cropTop - cropBottom;
    
    console.log(`Cropping: top=${cropTop}, right=${cropRight}, left=${cropLeft}, bottom=${cropBottom}`);
    console.log(`Cropped dimensions: ${cropWidth} × ${cropHeight}`);

    if (cropWidth <= 0 || cropHeight <= 0) {
      console.error(`Invalid crop dimensions`);
      process.exit(1);
    }

    // Apply crop
    let processedImage = sharp(imageBuffer).extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    });

    // Now process to target size: 190px width × 245px height
    const TARGET_WIDTH = 190;
    const TARGET_HEIGHT = 245;
    
    // Step 1: Resize height to 245px (maintain aspect ratio, allow enlarging if smaller)
    processedImage = processedImage.resize(null, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: false, // Allow enlarging smaller images
    });
    
    // Step 2: Get dimensions after height resize
    const resizedBuffer = await processedImage.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    const resizedWidth = resizedMeta.width || TARGET_WIDTH;
    const resizedHeight = resizedMeta.height || TARGET_HEIGHT;
    console.log(`After height resize: ${resizedWidth} × ${resizedHeight}`);
    
    // Step 3: Crop width to 190px (centered) if needed
    if (resizedWidth > TARGET_WIDTH) {
      const cropLeftFinal = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
      processedImage = sharp(resizedBuffer).extract({
        left: cropLeftFinal,
        top: 0,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });
      console.log(`Cropped width to ${TARGET_WIDTH}px (centered, left=${cropLeftFinal})`);
    } else if (resizedWidth < TARGET_WIDTH) {
      // If width is smaller, resize to exact dimensions (cover mode)
      processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover', // Cover the area, may crop
      });
      console.log(`Resized to exact dimensions (cover mode)`);
    }

    const headshotBuffer = await processedImage
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const finalMetadata = await sharp(headshotBuffer).metadata();
    console.log(`Final dimensions: ${finalMetadata.width} × ${finalMetadata.height}`);
    
    // Upload to Supabase
    const folderName = 'securepic';
    const storagePath = `${folderName}/${actressId}/headshot.jpg`;
    await uploadToSupabase(supabase, 'glamourgirls_images', storagePath, headshotBuffer);
    
    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;

    await client.query('BEGIN');
    
    // Delete existing headshot if it exists
    await client.query(
      `DELETE FROM images WHERE girlid = $1 AND path ILIKE '%headshot%'`,
      [actressId]
    );
    
    // Insert new headshot into database (as thumbnail type)
    await client.query(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
       VALUES ($1, $2, $3, $4, 3, $5, $6)`,
      [actressId, dbPath, finalMetadata.width || TARGET_WIDTH, finalMetadata.height || TARGET_HEIGHT, 'image/jpeg', headshotBuffer.length]
    );

    await client.query('COMMIT');
    
    console.log(`✓ Headshot extracted, processed, and uploaded successfully`);
    console.log(`  Database path: ${dbPath}`);
    console.log(`  Supabase path: ${storagePath}`);
    
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`✗ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

// Get arguments from command line
const actressId = parseInt(process.argv[2]);
const gifPath = process.argv[3];

if (!actressId || isNaN(actressId) || !gifPath) {
  console.error('Usage: tsx scripts/extract-headshot-from-gif.ts <actressId> <gifPath>');
  console.error('Example: tsx scripts/extract-headshot-from-gif.ts 729 gg26_old_secure/729/11140.gif');
  process.exit(1);
}

extractHeadshotFromGif(actressId, gifPath).catch(console.error);

