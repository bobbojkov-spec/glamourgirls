/**
 * Script to re-upload images from old securepic folder to Supabase storage
 * Usage: tsx scripts/reupload-actress-images.ts <actressId>
 * Example: tsx scripts/reupload-actress-images.ts 1
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import pool, { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Helper function to create watermark using SVG (same as upload route)
function createWatermarkSVG(text: string, imageWidth: number, imageHeight: number): Buffer {
  const targetTextWidth = 475;
  const estimatedFontSize = Math.min(Math.max(targetTextWidth / (text.length * 0.6), 24), 48);
  
  const x = imageWidth / 2;
  const y = imageHeight - 15;
  
  const svg = Buffer.from(`
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="1" dy="1" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.55"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <text
        x="${x}"
        y="${y}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${estimatedFontSize}"
        font-style="italic"
        text-anchor="middle"
        dominant-baseline="baseline"
        fill="rgba(255, 255, 255, 0.85)"
        stroke="rgba(0, 0, 0, 0.55)"
        stroke-width="1"
        filter="url(#shadow)"
      >${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
    </svg>
  `);
  
  return svg;
}

// Helper function to format image description: "2557 × 3308 px (24.2 MB)"
function formatImageDescription(width: number, height: number, fileSizeBytes: number): string {
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  return `${width} × ${height} px (${fileSizeMB} MB)`;
}

async function uploadToSupabase(
  supabase: any,
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  // Remove leading slash if present
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

async function reuploadActressImages(actressId: number) {
  const OLD_FOLDER = '/Users/borislavbojkov/dev/gg26_old_secure';
  const actressFolder = path.join(OLD_FOLDER, actressId.toString());
  
  // Check if folder exists
  try {
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

  // Get database pool
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    // Read all image files from old folder (jpg, jpeg, png, but exclude thumbnails and gifs)
    const files = await readdir(actressFolder);
    const imageFiles = files.filter(
      (f) => 
        (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.JPG') || f.endsWith('.png')) &&
        !f.includes('thumb') &&
        !f.endsWith('.gif')
    );

    console.log(`Found ${imageFiles.length} image files for actress ${actressId}`);

    const GALLERY_MAX_SIZE = 900;
    const HQ_THRESHOLD = 1500;
    const folderName = 'securepic'; // Use securepic for re-uploads

    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const fileName of imageFiles) {
      try {
        const filePath = path.join(actressFolder, fileName);
        const buffer = await readFile(filePath);

        // Get image metadata
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const longerSide = Math.max(width, height);

        if (width === 0 || height === 0) {
          console.log(`  ⚠ Skipping ${fileName}: Invalid dimensions`);
          skipped++;
          continue;
        }

        console.log(`\nProcessing ${fileName} (${width}x${height}px)...`);

        // Generate unique filename (timestamp + original name)
        const timestamp = Date.now();
        const fileExt = path.extname(fileName) || '.jpg';
        const baseFileName = `${timestamp}_${path.basename(fileName, fileExt).replace(/[^a-z0-9]/gi, '_')}`;
        
        let galleryImageId: number;
        let galleryDbPath: string;
        let galleryWidth = width;
        let galleryHeight = height;
        let hqImageId: number | null = null;
        let galleryBuffer: Buffer; // Will hold the final gallery image buffer

        await client.query('BEGIN');

        // If longer side > 1500px, save original as HQ and create resized gallery image
        if (longerSide > HQ_THRESHOLD) {
          console.log(`  → Creating HQ version (${longerSide}px > ${HQ_THRESHOLD}px threshold)`);
          
          // Upload original as HQ to Supabase
          const hqFileName = `${baseFileName}_hq${fileExt}`;
          const hqStoragePath = `${folderName}/${actressId}/${hqFileName}`;
          
          await uploadToSupabase(supabase, 'images_raw', hqStoragePath, buffer);
          const hqDbPath = `/${folderName}/${actressId}/${hqFileName}`;

          // Generate description for HQ images if longer side > 1200px
          const hqDescription = longerSide > 1200 ? formatImageDescription(width, height, buffer.length) : null;
          
          // Insert HQ image into database
          const hqResult = await client.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
             VALUES ($1, $2, $3, $4, 5, $5, $6, $7) RETURNING id`,
            [actressId, hqDbPath, width, height, 'image/jpeg', buffer.length, hqDescription]
          );
          
          hqImageId = hqResult.rows[0]?.id;
          console.log(`  ✓ HQ image uploaded and saved (ID: ${hqImageId})`);

          // Create resized gallery image (max 900px on longer side)
          let galleryImage = image
            .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
              fit: 'inside',
              withoutEnlargement: true,
            });
          
          const resizedForWatermark = await galleryImage.toBuffer();
          const resizedMeta = await sharp(resizedForWatermark).metadata();
          const resizedWidth = resizedMeta.width || GALLERY_MAX_SIZE;
          const resizedHeight = resizedMeta.height || GALLERY_MAX_SIZE;
          
          // Create watermark
          const watermarkText = 'www.GlamourGirlsOftheSilverScreen.com';
          const watermarkSVG = createWatermarkSVG(watermarkText, resizedWidth, resizedHeight);
          
          // Composite watermark onto gallery image
          galleryBuffer = await galleryImage
            .composite([{
              input: watermarkSVG,
              top: 0,
              left: 0,
            }])
            .jpeg({ quality: 85 })
            .toBuffer();

          const galleryFileName = `${baseFileName}${fileExt}`;
          const galleryStoragePath = `${folderName}/${actressId}/${galleryFileName}`;
          
          // Upload gallery image to Supabase
          await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer);
          galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;

          const galleryMeta = await sharp(galleryBuffer).metadata();
          galleryWidth = galleryMeta.width || width;
          galleryHeight = galleryMeta.height || height;

          // Generate description for gallery images if original longer side > 1200px
          const galleryDescription = longerSide > 1200 ? formatImageDescription(galleryWidth, galleryHeight, galleryBuffer.length) : null;
          
          // Insert gallery image into database
          const galleryResult = await client.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
             VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`,
            [actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryBuffer.length, galleryDescription]
          );

          galleryImageId = galleryResult.rows[0]?.id;
          console.log(`  ✓ Gallery image uploaded and saved (ID: ${galleryImageId})`);
        } else {
          // Image is <= 1500px, resize to gallery size (900px max) and save as gallery image only
          console.log(`  → Creating gallery version only (${longerSide}px <= ${HQ_THRESHOLD}px threshold)`);
          
          galleryBuffer = buffer;
          let finalGalleryWidth = width;
          let finalGalleryHeight = height;
          
          if (longerSide > GALLERY_MAX_SIZE) {
            let resizedImage = image
              .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
                fit: 'inside',
                withoutEnlargement: true,
              });
            
            const tempBuffer = await resizedImage.toBuffer();
            const resizedMeta = await sharp(tempBuffer).metadata();
            finalGalleryWidth = resizedMeta.width || width;
            finalGalleryHeight = resizedMeta.height || height;
            
            const watermarkText = 'www.GlamourGirlsOftheSilverScreen.com';
            const watermarkSVG = createWatermarkSVG(watermarkText, finalGalleryWidth, finalGalleryHeight);
            
            galleryBuffer = await resizedImage
              .composite([{
                input: watermarkSVG,
                top: 0,
                left: 0,
              }])
              .jpeg({ quality: 85 })
              .toBuffer();
          } else {
            // Image is already <= 900px, but still add watermark
            const watermarkText = 'www.GlamourGirlsOftheSilverScreen.com';
            const watermarkSVG = createWatermarkSVG(watermarkText, width, height);
            
            galleryBuffer = await image
              .composite([{
                input: watermarkSVG,
                top: 0,
                left: 0,
              }])
              .jpeg({ quality: 85 })
              .toBuffer();
          }
          
          const galleryFileName = `${baseFileName}${fileExt}`;
          const galleryStoragePath = `${folderName}/${actressId}/${galleryFileName}`;
          
          // Upload gallery image to Supabase
          await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer);
          galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;

          // Generate description for gallery images if original longer side > 1200px
          const galleryDescription = longerSide > 1200 ? formatImageDescription(finalGalleryWidth, finalGalleryHeight, galleryBuffer.length) : null;
          
          // Insert gallery image into database
          const galleryResult = await client.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
             VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`,
            [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryBuffer.length, galleryDescription]
          );

          galleryImageId = galleryResult.rows[0]?.id;
          galleryWidth = finalGalleryWidth;
          galleryHeight = finalGalleryHeight;
          console.log(`  ✓ Gallery image uploaded and saved (ID: ${galleryImageId})`);
        }

        // Create thumbnail from gallery image buffer
        const thumbBuffer = await sharp(galleryBuffer)
          .resize(200, 250, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        const thumbFileName = `thumb${baseFileName}.jpg`;
        const thumbStoragePath = `${folderName}/${actressId}/${thumbFileName}`;
        
        // Upload thumbnail to Supabase
        await uploadToSupabase(supabase, 'glamourgirls_images', thumbStoragePath, thumbBuffer);
        const thumbDbPath = `/${folderName}/${actressId}/${thumbFileName}`;

        const thumbMeta = await sharp(thumbBuffer).metadata();

        // Insert thumbnail into database
        const thumbResult = await client.query(
          `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
           VALUES ($1, $2, $3, $4, 3, $5, $6, $7) RETURNING id`,
          [actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbBuffer.length]
        );

        const thumbId = thumbResult.rows[0]?.id;

        // Update gallery image with thumbnail ID
        await client.query(
          `UPDATE images SET thumbid = $1 WHERE id = $2`,
          [thumbId, galleryImageId]
        );

        await client.query('COMMIT');
        uploaded++;
        console.log(`  ✓ Thumbnail uploaded and saved (ID: ${thumbId})`);

      } catch (error: any) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(`  ✗ Error processing ${fileName}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Uploaded: ${uploaded}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

// Get actress ID from command line
const actressId = parseInt(process.argv[2]);

if (!actressId || isNaN(actressId)) {
  console.error('Usage: tsx scripts/reupload-actress-images.ts <actressId>');
  console.error('Example: tsx scripts/reupload-actress-images.ts 1');
  process.exit(1);
}

reuploadActressImages(actressId).catch(console.error);

