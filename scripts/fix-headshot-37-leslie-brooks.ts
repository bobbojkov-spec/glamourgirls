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
 * Fix headshot for actress 37 (Leslie Brooks) from 180.gif
 * Process according to headshot rule: resize height to 245px, crop width to 190px (centered)
 * Upload to Supabase Storage and update database
 */

async function fixHeadshotFor37() {
  const actressId = 37;
  const sourceFileName = '180.gif';
  
  // Try multiple possible paths
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'newpic', actressId.toString(), sourceFileName),
    path.join(process.cwd(), 'public', 'securepic', actressId.toString(), sourceFileName),
  ];
  
  let sourceImagePath: string | null = null;
  let imageBuffer: Buffer | null = null;
  
  try {
    // Try to find the image locally
    for (const possiblePath of possiblePaths) {
      try {
        await fs.access(possiblePath);
        sourceImagePath = possiblePath;
        console.log(`Found source image: ${sourceImagePath}`);
        imageBuffer = await fs.readFile(sourceImagePath);
        break;
      } catch {
        continue;
      }
    }
    
    // If not found locally, try to download from Supabase
    if (!imageBuffer) {
      console.log('Image not found locally, trying Supabase...');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Try different possible paths in Supabase
        const supabasePaths = [
          `newpic/${actressId}/${sourceFileName}`,
          `securepic/${actressId}/${sourceFileName}`,
        ];
        
        for (const supabasePath of supabasePaths) {
          try {
            const { data, error } = await supabase.storage
              .from('glamourgirls_images')
              .download(supabasePath);
            
            if (!error && data) {
              const arrayBuffer = await data.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              console.log(`Downloaded image from Supabase: ${supabasePath}`);
              break;
            }
          } catch {
            continue;
          }
        }
      }
    }
    
    if (!imageBuffer) {
      throw new Error(`Could not find image ${sourceFileName}. Tried paths: ${possiblePaths.join(', ')}`);
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Process the image (already loaded)
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }
    
    // Process headshot to exact size: 190px width × 245px height
    // Rule: Make height 245px, crop width to 190px (centered)
    // If image is smaller, resize to height 245px (blow up), then crop width to 190px
    const TARGET_WIDTH = 190;
    const TARGET_HEIGHT = 245;
    
    // Step 1: Resize height to 245px (maintain aspect ratio, allow enlarging if smaller)
    let processedImage = sharp(imageBuffer).resize(null, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: false, // Allow enlarging smaller images
    });
    
    // Step 2: Get dimensions after height resize
    const resizedBuffer = await processedImage.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    const resizedWidth = resizedMeta.width || TARGET_WIDTH;
    const resizedHeight = resizedMeta.height || TARGET_HEIGHT;
    
    console.log(`After height resize: ${resizedWidth}x${resizedHeight}`);
    
    // Step 3: Crop width to 190px (centered) if needed
    if (resizedWidth > TARGET_WIDTH) {
      const cropLeft = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
      processedImage = sharp(resizedBuffer).extract({
        left: cropLeft,
        top: 0,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });
      console.log(`Cropping width: left=${cropLeft}, width=${TARGET_WIDTH}`);
    } else if (resizedWidth < TARGET_WIDTH) {
      // If width is smaller, resize to exact dimensions (cover mode)
      processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover', // Cover the area, may crop
      });
      console.log(`Resizing to cover: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
    }
    // If exactly 190px, no crop needed
    
    // Convert to JPEG
    const headshotBuffer = await processedImage
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    
    const processedMetadata = await sharp(headshotBuffer).metadata();
    console.log(`Processed headshot dimensions: ${processedMetadata.width}x${processedMetadata.height}`);
    
    // Determine folder (check which one has images)
    let folderName = 'newpic';
    try {
      const { data: securepicFiles } = await supabase.storage
        .from('glamourgirls_images')
        .list(`securepic/${actressId}`, { limit: 1 });
      
      if (securepicFiles && securepicFiles.length > 0) {
        folderName = 'securepic';
      }
    } catch {
      // Use newpic default
    }
    
    const headshotPath = `${folderName}/${actressId}/headshot.jpg`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('glamourgirls_images')
      .upload(headshotPath, headshotBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload headshot: ${uploadError.message}`);
    }
    
    console.log(`✓ Headshot uploaded to: ${headshotPath}`);
    
    // Insert or update headshot record in database
    try {
      // Check if headshot record exists
      const [existing] = await pool.execute(
        `SELECT id FROM images WHERE girlid = ? AND (path LIKE '%headshot.jpg%' OR path LIKE '%headshot.jpeg%') LIMIT 1`,
        [actressId]
      ) as any[];
      
      if (Array.isArray(existing) && existing.length > 0) {
        // Update existing
        await pool.execute(
          `UPDATE images 
           SET width = ?, height = ?, path = ?
           WHERE id = ?`,
          [processedMetadata.width, processedMetadata.height, `/${headshotPath}`, existing[0].id]
        );
        console.log(`✓ Updated headshot in database (id: ${existing[0].id})`);
      } else {
        // Insert new - use mytp = 3 for thumbnails/headshots
        await pool.execute(
          `INSERT INTO images (girlid, path, width, height, mytp, sz)
           VALUES (?, ?, ?, ?, 3, ?)`,
          [actressId, `/${headshotPath}`, processedMetadata.width, processedMetadata.height, headshotBuffer.length]
        );
        console.log(`✓ Inserted headshot in database`);
      }
    } catch (dbError) {
      console.error('Error updating database (non-critical):', dbError);
      console.log('Note: Headshot is uploaded to Supabase, but database record may be missing');
      console.log('You may need to manually insert the record or the API will fall back to gallery images');
    }
    
    console.log(`\n✓ Headshot created successfully for Leslie Brooks (ID ${actressId})!`);
    return true;
  } catch (error: any) {
    console.error('Error creating headshot:', error);
    throw error;
  }
}

fixHeadshotFor37()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

