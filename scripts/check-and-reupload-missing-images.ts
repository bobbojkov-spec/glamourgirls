/**
 * Script to check for missing images and re-upload from old securepic folder
 * 
 * This script:
 * 1. Scans the database for actresses
 * 2. Checks if they have headshots and gallery images
 * 3. Cross-references with old folder structure
 * 4. Only processes actresses that are missing images
 * 
 * Usage: tsx scripts/check-and-reupload-missing-images.ts [actressId]
 * If actressId is provided, only checks/processes that actress
 * Example: tsx scripts/check-and-reupload-missing-images.ts 3
 */

import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import pool, { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const OLD_FOLDER = '/Users/borislavbojkov/dev/gg26_old_secure';

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
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return cleanPath;
}

async function checkActressImages(actressId: number, pgPool: any): Promise<{
  hasHeadshot: boolean;
  galleryCount: number;
  hqCount: number;
}> {
  const client = await pgPool.connect();
  try {
    // Check for headshot - look for images with path containing 'headshot'
    const headshotResult = await client.query(
      `SELECT COUNT(*)::int as count 
       FROM images 
       WHERE girlid = $1 
         AND path ILIKE '%headshot%'`,
      [actressId]
    );

    // Check for gallery images (mytp = 4)
    const galleryResult = await client.query(
      `SELECT COUNT(*)::int as count 
       FROM images 
       WHERE girlid = $1 
         AND mytp = 4 
         AND (path LIKE '%securepic%' OR path LIKE '%newpic%')`,
      [actressId]
    );

    // Check for HQ images (mytp = 5)
    const hqResult = await client.query(
      `SELECT COUNT(*)::int as count 
       FROM images 
       WHERE girlid = $1 
         AND mytp = 5 
         AND (path LIKE '%securepic%' OR path LIKE '%newpic%')`,
      [actressId]
    );

    return {
      hasHeadshot: (headshotResult.rows[0]?.count || 0) > 0,
      galleryCount: galleryResult.rows[0]?.count || 0,
      hqCount: hqResult.rows[0]?.count || 0,
    };
  } finally {
    client.release();
  }
}

async function findHeadshotInOldFolder(actressFolder: string): Promise<string | null> {
  try {
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

async function uploadHeadshot(
  actressId: number,
  headshotPath: string,
  supabase: any,
  pgPool: any
): Promise<boolean> {
  const client = await pgPool.connect();
  try {
    const buffer = await readFile(headshotPath);
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      console.error(`  ✗ Invalid headshot dimensions: ${headshotPath}`);
      return false;
    }

    // Process headshot with crop (same as upload route)
    const cropLeft = 25;
    const cropTop = 40;
    const cropRight = 28;
    const cropBottom = 40;
    
    const width = metadata.width - cropLeft - cropRight;
    const height = metadata.height - cropTop - cropBottom;
    
    if (width <= 0 || height <= 0) {
      console.error(`  ✗ Invalid crop dimensions for headshot`);
      return false;
    }

    const processedImage = image.extract({
      left: cropLeft,
      top: cropTop,
      width,
      height,
    });

    const headshotBuffer = await processedImage
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const finalMetadata = await sharp(headshotBuffer).metadata();
    
    // Upload to Supabase
    const folderName = 'securepic';
    const storagePath = `${folderName}/${actressId}/headshot.jpg`;
    await uploadToSupabase(supabase, 'glamourgirls_images', storagePath, headshotBuffer);
    
    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;

    await client.query('BEGIN');
    
    // Insert headshot into database (as thumbnail type)
    await client.query(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
       VALUES ($1, $2, $3, $4, 3, $5, $6)`,
      [actressId, dbPath, finalMetadata.width || width, finalMetadata.height || height, 'image/jpeg', headshotBuffer.length]
    );

    await client.query('COMMIT');
    
    console.log(`  ✓ Headshot uploaded and saved`);
    return true;
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`  ✗ Error uploading headshot: ${error.message}`);
    return false;
  } finally {
    client.release();
  }
}

async function reuploadGalleryImages(
  actressId: number,
  actressFolder: string,
  supabase: any,
  pgPool: any,
  skipExisting: boolean = true
): Promise<{ uploaded: number; errors: number }> {
  const GALLERY_MAX_SIZE = 900;
  const HQ_THRESHOLD = 1500;
  const folderName = 'securepic';

  let uploaded = 0;
  let errors = 0;

  try {
    const files = await readdir(actressFolder);
    const imageFiles = files.filter(
      (f) => 
        (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.JPG') || f.endsWith('.png')) &&
        !f.includes('thumb') &&
        !f.endsWith('.gif') &&
        f !== 'headshot.jpg' &&
        f !== '1.jpg' // Skip potential headshot files
    );

    console.log(`  Found ${imageFiles.length} potential gallery images in old folder`);

    for (const fileName of imageFiles) {
      try {
        const filePath = path.join(actressFolder, fileName);
        const buffer = await readFile(filePath);

        const image = sharp(buffer);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const longerSide = Math.max(width, height);

        if (width === 0 || height === 0) {
          continue;
        }

        const client = await pgPool.connect();
        try {
          await client.query('BEGIN');

          const timestamp = Date.now();
          const fileExt = path.extname(fileName) || '.jpg';
          const baseFileName = `${timestamp}_${path.basename(fileName, fileExt).replace(/[^a-z0-9]/gi, '_')}`;
          
          let galleryImageId: number;
          let galleryDbPath: string;
          let galleryWidth = width;
          let galleryHeight = height;
          let hqImageId: number | null = null;
          let galleryBuffer: Buffer;

          if (longerSide > HQ_THRESHOLD) {
            // Create HQ version
            const hqFileName = `${baseFileName}_hq${fileExt}`;
            const hqStoragePath = `${folderName}/${actressId}/${hqFileName}`;
            
            await uploadToSupabase(supabase, 'images_raw', hqStoragePath, buffer);
            const hqDbPath = `/${folderName}/${actressId}/${hqFileName}`;

            const hqResult = await client.query(
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 5, $5, $6) RETURNING id`,
              [actressId, hqDbPath, width, height, 'image/jpeg', buffer.length]
            );
            
            hqImageId = hqResult.rows[0]?.id;

            // Create gallery version
            let galleryImage = image
              .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
                fit: 'inside',
                withoutEnlargement: true,
              });
            
            const resizedForWatermark = await galleryImage.toBuffer();
            const resizedMeta = await sharp(resizedForWatermark).metadata();
            const resizedWidth = resizedMeta.width || GALLERY_MAX_SIZE;
            const resizedHeight = resizedMeta.height || GALLERY_MAX_SIZE;
            
            const watermarkText = 'www.GlamourGirlsOftheSilverScreen.com';
            const watermarkSVG = createWatermarkSVG(watermarkText, resizedWidth, resizedHeight);
            
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
            
            await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer);
            galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;

            const galleryMeta = await sharp(galleryBuffer).metadata();
            galleryWidth = galleryMeta.width || width;
            galleryHeight = galleryMeta.height || height;

            const galleryResult = await client.query(
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 4, $5, $6) RETURNING id`,
              [actressId, galleryDbPath, galleryWidth, galleryHeight, 'image/jpeg', galleryBuffer.length]
            );

            galleryImageId = galleryResult.rows[0]?.id;
          } else {
            // Gallery only
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
            
            await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer);
            galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;

            const galleryResult = await client.query(
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 4, $5, $6) RETURNING id`,
              [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, 'image/jpeg', galleryBuffer.length]
            );

            galleryImageId = galleryResult.rows[0]?.id;
            galleryWidth = finalGalleryWidth;
            galleryHeight = finalGalleryHeight;
          }

          // Create thumbnail
          const thumbBuffer = await sharp(galleryBuffer)
            .resize(200, 250, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          const thumbFileName = `thumb${baseFileName}.jpg`;
          const thumbStoragePath = `${folderName}/${actressId}/${thumbFileName}`;
          
          await uploadToSupabase(supabase, 'glamourgirls_images', thumbStoragePath, thumbBuffer);
          const thumbDbPath = `/${folderName}/${actressId}/${thumbFileName}`;

          const thumbMeta = await sharp(thumbBuffer).metadata();

          const thumbResult = await client.query(
            `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
             VALUES ($1, $2, $3, $4, 3, $5, $6, $7) RETURNING id`,
            [actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbBuffer.length]
          );

          const thumbId = thumbResult.rows[0]?.id;

          await client.query(
            `UPDATE images SET thumbid = $1 WHERE id = $2`,
            [thumbId, galleryImageId]
          );

          await client.query('COMMIT');
          uploaded++;
        } catch (fileError: any) {
          await client.query('ROLLBACK').catch(() => {});
          console.error(`  ✗ Error processing ${fileName}: ${fileError.message}`);
          errors++;
        } finally {
          client.release();
        }
      } catch (error: any) {
        console.error(`  ✗ Error reading ${fileName}: ${error.message}`);
        errors++;
      }
    }

    return { uploaded, errors };
  } catch (error: any) {
    console.error(`  ✗ Error reading actress folder: ${error.message}`);
    return { uploaded: 0, errors: 1 };
  }
}

async function processActress(actressId: number, supabase: any, pgPool: any): Promise<void> {
  const actressFolder = path.join(OLD_FOLDER, actressId.toString());
  
  // Check if old folder exists
  let oldFolderExists = false;
  try {
    await stat(actressFolder);
    oldFolderExists = true;
  } catch {
    console.log(`  ⚠ Old folder not found: ${actressFolder}`);
  }

  // Check current database state
  const imageStatus = await checkActressImages(actressId, pgPool);
  
  console.log(`\nActress ${actressId}:`);
  console.log(`  Headshot: ${imageStatus.hasHeadshot ? '✓' : '✗'}`);
  console.log(`  Gallery images: ${imageStatus.galleryCount}`);
  console.log(`  HQ images: ${imageStatus.hqCount}`);

  if (!oldFolderExists) {
    console.log(`  ⚠ Skipping - old folder not found`);
    return;
  }

  let needsProcessing = false;

  // Check headshot
  if (!imageStatus.hasHeadshot) {
    console.log(`  → Missing headshot, checking old folder...`);
    const headshotPath = await findHeadshotInOldFolder(actressFolder);
    if (headshotPath) {
      await uploadHeadshot(actressId, headshotPath, supabase, pgPool);
      needsProcessing = true;
    } else {
      console.log(`  ⚠ No headshot found in old folder`);
    }
  } else {
    console.log(`  ✓ Headshot exists, skipping`);
  }

  // Check gallery images
  if (imageStatus.galleryCount === 0) {
    console.log(`  → Missing gallery images, uploading from old folder...`);
    const result = await reuploadGalleryImages(actressId, actressFolder, supabase, pgPool);
    console.log(`  → Uploaded ${result.uploaded} gallery images, ${result.errors} errors`);
    needsProcessing = true;
  } else {
    console.log(`  ✓ Gallery images exist (${imageStatus.galleryCount}), skipping`);
  }

  if (!needsProcessing) {
    console.log(`  ✓ All images present, no processing needed`);
  }
}

async function main() {
  const targetActressId = process.argv[2] ? parseInt(process.argv[2]) : null;

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const pgPool = getPool();

  try {
    if (targetActressId) {
      // Process specific actress
      await processActress(targetActressId, supabase, pgPool);
    } else {
      // Process all actresses
      console.log('Scanning all actresses...\n');
      const client = await pgPool.connect();
      try {
        const [actresses] = await client.query(
          `SELECT id FROM girls WHERE published = 2 ORDER BY id ASC`
        ) as any[];

        console.log(`Found ${actresses.length} published actresses\n`);

        for (const actress of actresses) {
          await processActress(actress.id, supabase, pgPool);
        }
      } finally {
        client.release();
      }
    }
  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

main().catch(console.error);

