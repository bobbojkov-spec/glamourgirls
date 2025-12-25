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
 * Create headshot for actress 732 (Adriana Caselotti) from 11149.png
 * Crop rules: top 30px, right 30px, left 25px, bottom 25px
 * Convert to JPEG and save as headshot.jpg
 * Upload to Supabase Storage
 */

async function createHeadshotFor732() {
  const actressId = 732;
  
  // Try multiple possible paths
  const possiblePaths = [
    path.join(process.cwd(), 'dev', 'gg26_old_secure', '732', '11149.png'),
    path.join(process.cwd(), 'gg26_old_secure', '732', '11149.png'),
    path.join(process.cwd(), '..', 'gg26_old_secure', '732', '11149.png'),
    path.join(process.cwd(), 'securepic', '732', '11149.png'),
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
          `securepic/${actressId}/11149.png`,
          `newpic/${actressId}/11149.png`,
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
      throw new Error(`Could not find image 11149.png. Tried paths: ${possiblePaths.join(', ')}`);
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
    
    // Crop rules: top 30px, right 30px, left 25px, bottom 25px
    const top = 30;
    const left = 25;
    const right = 30;
    const bottom = 25;
    
    const width = metadata.width - left - right; // Total width minus left and right crops
    const height = metadata.height - top - bottom; // Total height minus top and bottom crops
    
    console.log(`Cropping: left=${left}, top=${top}, width=${width}, height=${height}`);
    
    // Validate crop dimensions
    if (width <= 0 || height <= 0 || left + width > metadata.width || top + height > metadata.height) {
      throw new Error(`Invalid crop dimensions: ${metadata.width}x${metadata.height} -> ${width}x${height}`);
    }
    
    // Crop and convert to JPEG
    const processedImage = await sharp(imageBuffer)
      .extract({
        left,
        top,
        width,
        height,
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
    
    const processedMetadata = await sharp(processedImage).metadata();
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
      .upload(headshotPath, processedImage, {
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
          [processedMetadata.width, processedMetadata.height, headshotPath, existing[0].id]
        );
        console.log(`✓ Updated headshot in database (id: ${existing[0].id})`);
      } else {
        // Insert new - use mytp = 3 for thumbnails/headshots
        await pool.execute(
          `INSERT INTO images (girlid, path, width, height, mytp, sz)
           VALUES (?, ?, ?, ?, 3, ?)`,
          [actressId, headshotPath, processedMetadata.width, processedMetadata.height, processedImage.length]
        );
        console.log(`✓ Inserted headshot in database`);
      }
    } catch (dbError) {
      console.error('Error updating database (non-critical):', dbError);
      console.log('Note: Headshot is uploaded to Supabase, but database record may be missing');
      console.log('You may need to manually insert the record or the API will fall back to gallery images');
    }
    
    console.log(`✓ Headshot created successfully!`);
    return true;
  } catch (error: any) {
    console.error('Error creating headshot:', error);
    throw error;
  }
}

createHeadshotFor732()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

