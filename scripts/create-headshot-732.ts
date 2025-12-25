import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

// Create database connection
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Create headshot for actress 732 (Adriana Caselotti) from 11149.png
 * - Crop: 40px top, 40px bottom, 25px left, 28px right
 * - Convert to JPEG and save as headshot.jpg
 * - Upload to Supabase Storage
 */

async function createHeadshotFor732() {
  const actressId = 732;
  const imageId = 11149;
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Skip database query for now - search Supabase Storage directly
    
    // Try to find the image in Supabase Storage
    // User mentioned it's the second GIF, so check for GIF files first
    const possiblePaths = [
      `securepic/${actressId}/11149.png`,
      `securepic/${actressId}/11149.gif`,
      `newpic/${actressId}/11149.png`,
      `newpic/${actressId}/11149.gif`,
      `securepic/${actressId}/${imageId}.png`,
      `securepic/${actressId}/${imageId}.gif`,
      `newpic/${actressId}/${imageId}.png`,
      `newpic/${actressId}/${imageId}.gif`,
    ];
    
    let imageBuffer: Buffer | null = null;
    let sourcePath: string | null = null;
    
    for (const storagePath of possiblePaths) {
      try {
        const { data, error } = await supabase.storage
          .from('glamourgirls_images')
          .download(storagePath);
        
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
          sourcePath = storagePath;
          console.log(`Found image at: ${storagePath}`);
          break;
        }
      } catch (err) {
        // Continue searching
        continue;
      }
    }
    
    if (!imageBuffer) {
      // Try to find any PNG/GIF in the actress folder (user said it's the second GIF)
      try {
        // Check securepic first
        const { data: securepicFiles } = await supabase.storage
          .from('glamourgirls_images')
          .list(`securepic/${actressId}`, { limit: 100 });
        
        if (securepicFiles && securepicFiles.length > 0) {
          // Filter for GIF files (user said it's the second GIF)
          const gifFiles = securepicFiles.filter(f => 
            f.name.toLowerCase().endsWith('.gif') || 
            f.name.toLowerCase().includes('11149')
          );
          
          if (gifFiles.length >= 2) {
            // User said it's the second GIF
            const file = gifFiles[1];
            const { data, error } = await supabase.storage
              .from('glamourgirls_images')
              .download(`securepic/${actressId}/${file.name}`);
            
            if (!error && data) {
              const arrayBuffer = await data.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              sourcePath = `securepic/${actressId}/${file.name}`;
              console.log(`Found second GIF: ${file.name}`);
            }
          } else if (gifFiles.length > 0) {
            // Use the first GIF if only one exists
            const file = gifFiles[0];
            const { data, error } = await supabase.storage
              .from('glamourgirls_images')
              .download(`securepic/${actressId}/${file.name}`);
            
            if (!error && data) {
              const arrayBuffer = await data.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuffer);
              sourcePath = `securepic/${actressId}/${file.name}`;
              console.log(`Found GIF: ${file.name}`);
            }
          }
          
          // Also check for PNG files with 11149
          if (!imageBuffer) {
            const pngFiles = securepicFiles.filter(f => 
              f.name.toLowerCase().includes('11149') || 
              f.name.toLowerCase().endsWith('.png')
            );
            if (pngFiles.length > 0) {
              const file = pngFiles[0];
              const { data, error } = await supabase.storage
                .from('glamourgirls_images')
                .download(`securepic/${actressId}/${file.name}`);
              
              if (!error && data) {
                const arrayBuffer = await data.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
                sourcePath = `securepic/${actressId}/${file.name}`;
                console.log(`Found PNG: ${file.name}`);
              }
            }
          }
        }
        
        // If still not found, check newpic
        if (!imageBuffer) {
          const { data: newpicFiles } = await supabase.storage
            .from('glamourgirls_images')
            .list(`newpic/${actressId}`, { limit: 100 });
          
          if (newpicFiles && newpicFiles.length > 0) {
            const gifFiles = newpicFiles.filter(f => 
              f.name.toLowerCase().endsWith('.gif') || 
              f.name.toLowerCase().includes('11149')
            );
            
            if (gifFiles.length >= 2) {
              const file = gifFiles[1];
              const { data, error } = await supabase.storage
                .from('glamourgirls_images')
                .download(`newpic/${actressId}/${file.name}`);
              
              if (!error && data) {
                const arrayBuffer = await data.arrayBuffer();
                imageBuffer = Buffer.from(arrayBuffer);
                sourcePath = `newpic/${actressId}/${file.name}`;
                console.log(`Found second GIF in newpic: ${file.name}`);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error searching for files:', err);
      }
    }
    
    if (!imageBuffer) {
      throw new Error('Could not find image 11149.png in Supabase Storage');
    }
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`Image dimensions: ${metadata.width}x${metadata.height}`);
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }
    
    // Crop: 40px top, 40px bottom, 25px left, 28px right
    const left = 25;
    const top = 40;
    const width = metadata.width - 53; // 25px from left, 28px from right
    const height = metadata.height - 80; // 40px from top and bottom
    
    // Validate crop dimensions
    if (width <= 0 || height <= 0 || left + width > metadata.width || top + height > metadata.height) {
      throw new Error(`Invalid crop dimensions: ${metadata.width}x${metadata.height} -> ${width}x${height}`);
    }
    
    console.log(`Cropping: left=${left}, top=${top}, width=${width}, height=${height}`);
    
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
    
    // Optionally, insert/update in database
    try {
      const [existing] = await pool.execute(
        `SELECT id FROM images WHERE girlid = ? AND path LIKE '%headshot.jpg%' LIMIT 1`,
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
        // Insert new
        const [result] = await pool.execute(
          `INSERT INTO images (girlid, path, width, height, mytp, sz)
           VALUES (?, ?, ?, ?, 3, ?)`,
          [actressId, headshotPath, processedMetadata.width, processedMetadata.height, processedImage.length]
        ) as any[];
        console.log(`✓ Inserted headshot in database`);
      }
    } catch (dbError) {
      console.error('Error updating database (non-critical):', dbError);
    }
    
    console.log('\n✓ Headshot created successfully!');
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

