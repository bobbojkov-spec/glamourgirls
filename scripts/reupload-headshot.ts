/**
 * Script to re-upload headshot for a specific actress with corrected cropping
 * Usage: tsx scripts/reupload-headshot.ts <actressId>
 * Example: tsx scripts/reupload-headshot.ts 3
 */

import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const OLD_FOLDER = '/Users/borislavbojkov/dev/gg26_old_secure';

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

async function findHeadshotInOldFolder(actressFolder: string): Promise<string | null> {
  try {
    const { readdir, stat } = await import('fs/promises');
    const files = await readdir(actressFolder);
    
    // Look for headshot files (common names: headshot.jpg, 1.jpg, portrait.jpg, etc.)
    const headshotPatterns = ['headshot.jpg', '1.jpg', 'portrait.jpg'];
    
    for (const pattern of headshotPatterns) {
      const filePath = path.join(actressFolder, pattern);
      try {
        await stat(filePath);
        return filePath;
      } catch {
        // File doesn't exist, continue
      }
    }
    
    // If no standard headshot found, try the first image file (sorted by name)
    const imageFiles = files.filter(
      (f) => (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.JPG')) && 
             !f.includes('thumb') && 
             !f.endsWith('.gif')
    ).sort();
    
    if (imageFiles.length > 0) {
      return path.join(actressFolder, imageFiles[0]);
    }
    
    return null;
  } catch (error) {
    console.error(`Error checking old folder for headshot: ${error}`);
    return null;
  }
}

async function reuploadHeadshot(actressId: number) {
  const actressFolder = path.join(OLD_FOLDER, actressId.toString());
  
  // Check if folder exists
  try {
    const { readdir } = await import('fs/promises');
    await readdir(actressFolder);
  } catch (error) {
    console.error(`Folder not found: ${actressFolder}`);
    process.exit(1);
  }

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
    // Find headshot in old folder
    const headshotPath = await findHeadshotInOldFolder(actressFolder);
    if (!headshotPath) {
      console.error(`No headshot found in old folder: ${actressFolder}`);
      process.exit(1);
    }

    console.log(`Found headshot: ${headshotPath}`);
    
    const buffer = await readFile(headshotPath);
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      console.error(`Invalid headshot dimensions: ${headshotPath}`);
      process.exit(1);
    }

    console.log(`Original dimensions: ${metadata.width} × ${metadata.height}`);

    // Process headshot to exact size: 190px width × 245px height
    // Rule: Make height 245px, crop width to 190px (centered)
    // If image is smaller, resize to height 245px (blow up), then crop width to 190px
    const TARGET_WIDTH = 190;
    const TARGET_HEIGHT = 245;
    
    // Step 1: Resize height to 225px (maintain aspect ratio, allow enlarging if smaller)
    let processedImage = image.resize(null, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: false, // Allow enlarging smaller images
    });
    
    // Step 2: Get dimensions after height resize
    const resizedBuffer = await processedImage.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    const resizedWidth = resizedMeta.width || TARGET_WIDTH;
    const resizedHeight = resizedMeta.height || TARGET_HEIGHT;
    console.log(`After height resize: ${resizedWidth} × ${resizedHeight}`);
    
    // Step 3: Crop width to 180px (centered) if needed
    if (resizedWidth > TARGET_WIDTH) {
      const cropLeft = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
      processedImage = sharp(resizedBuffer).extract({
        left: cropLeft,
        top: 0,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });
      console.log(`Cropped width to ${TARGET_WIDTH}px (centered, left=${cropLeft})`);
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
    
    console.log(`✓ Headshot re-uploaded and saved successfully`);
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

// Get actress ID from command line
const actressId = parseInt(process.argv[2]);

if (!actressId || isNaN(actressId)) {
  console.error('Usage: tsx scripts/reupload-headshot.ts <actressId>');
  console.error('Example: tsx scripts/reupload-headshot.ts 3');
  process.exit(1);
}

reuploadHeadshot(actressId).catch(console.error);

