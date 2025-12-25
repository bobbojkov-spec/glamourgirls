import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import pool, { getPool } from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Helper function to upload to Supabase storage
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

// Helper function to format image description: "2557 × 3308 px (24.2 MB)"
function formatImageDescription(width: number, height: number, fileSizeBytes: number): string {
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  return `${width} × ${height} px (${fileSizeMB} MB)`;
}

// Helper function to create watermark using SVG (Vercel-compatible)
function createWatermarkSVG(text: string, imageWidth: number, imageHeight: number): Buffer {
  // Calculate font size based on image width (target ~475px text width)
  // Approximate: font size ≈ text width / (text length * 0.6)
  const targetTextWidth = 475;
  const estimatedFontSize = Math.min(Math.max(targetTextWidth / (text.length * 0.6), 24), 48);
  
  const x = imageWidth / 2;
  const y = imageHeight - 15;
  
  // Create SVG with text watermark
  // Use system fonts that are available on most systems
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

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const formData = await request.formData();
    const actressId = parseInt(formData.get('actressId') as string);
    const type = formData.get('type') as string;
    const files = formData.getAll('images') as File[];

    if (!actressId || isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadedImages = [];
    const errors: string[] = [];
    
    // Use advisory lock to serialize image uploads for this actress
    const pgPool = getPool();
    const lockClient = await pgPool.connect();
    const lockKey = 2000000 + actressId; // Different range from girllinks locks
    
    try {
      await lockClient.query('BEGIN');
      const lockResult = await lockClient.query(`SELECT pg_try_advisory_xact_lock($1) as locked`, [lockKey]);
      if (!lockResult.rows[0]?.locked) {
        await lockClient.query('ROLLBACK');
        lockClient.release();
        return NextResponse.json(
          { error: 'Another upload is in progress. Please wait a moment and try again.' },
          { status: 409 }
        );
      }
      await lockClient.query('COMMIT');
    } catch (lockError) {
      await lockClient.query('ROLLBACK').catch(() => {});
      lockClient.release();
      return NextResponse.json(
        { error: 'Failed to acquire upload lock. Please try again.' },
        { status: 500 }
      );
    } finally {
      lockClient.release();
    }

    for (const file of files) {
      const fileClient = await pgPool.connect();
      try {
        await fileClient.query('BEGIN');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Get image metadata
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const longerSide = Math.max(width, height);
      const GALLERY_MAX_SIZE = 900; // Gallery images max 900px on longer side
      const HQ_THRESHOLD = 1500; // Images > 1500px get HQ version

      // Determine folder (use newpic for new uploads)
      const folderName = 'newpic'; // Default to newpic

      // Initialize Supabase client for storage uploads (REQUIRED)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
          { error: 'Supabase configuration missing. Cannot upload images.' },
          { status: 500 }
        );
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Generate unique filename (timestamp + random)
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const fileExt = path.extname(file.name) || '.jpg';
      const baseFileName = `${timestamp}_${random}`;
      
      let galleryImageId: number;
      let galleryDbPath: string;
      let galleryWidth = width;
      let galleryHeight = height;
      let hqImageId: number | null = null;
      let galleryBuffer: Buffer; // Declare outside if/else for thumbnail creation

      // If longer side > 1500px, save original as HQ and create resized gallery image
      if (longerSide > HQ_THRESHOLD) {
        // Upload original as HQ (mytp = 5) to Supabase storage (images_raw bucket for HQ)
        const hqFileName = `${baseFileName}_hq${fileExt}`;
        const hqDbPath = `/${folderName}/${actressId}/${hqFileName}`;
        const hqStoragePath = `${folderName}/${actressId}/${hqFileName}`;
        
        // Upload HQ to Supabase storage
        await uploadToSupabase(supabase, 'images_raw', hqStoragePath, buffer, file.type || 'image/jpeg');
        
        // Get file size in bytes
        const hqFileSize = buffer.length;
        
        // Generate description for HQ images if longer side > 1200px
        const hqDescription = longerSide > 1200 ? formatImageDescription(width, height, hqFileSize) : null;

        // Insert HQ image into database
        let hqRows: any;
        try {
          const result = await fileClient.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
             VALUES ($1, $2, $3, $4, 5, $5, $6, $7) RETURNING id`,
            [actressId, hqDbPath, width, height, file.type || 'image/jpeg', hqFileSize, hqDescription]
          );
          hqRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
            await fileClient.query('ROLLBACK');
            // Reset sequence outside transaction
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
            const result = await fileClient.query(
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
               VALUES ($1, $2, $3, $4, 5, $5, $6, $7) RETURNING id`,
              [actressId, hqDbPath, width, height, file.type || 'image/jpeg', hqFileSize, hqDescription]
            );
            hqRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }
        
        hqImageId = hqRows.rows[0]?.id;

        // Create resized gallery image (max 900px on longer side - lower quality to motivate HQ purchase)
        let galleryImage = image
          .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        
        // Get dimensions after resize for watermark positioning
        const resizedForWatermark = await galleryImage.toBuffer();
        const resizedMeta = await sharp(resizedForWatermark).metadata();
        const resizedWidth = resizedMeta.width || GALLERY_MAX_SIZE;
        const resizedHeight = resizedMeta.height || GALLERY_MAX_SIZE;
        
        // Create watermark using SVG (Vercel-compatible)
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
        galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;
        const galleryStoragePath = `${folderName}/${actressId}/${galleryFileName}`;
        
        // Upload gallery image to Supabase storage (glamourgirls_images bucket)
        await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer, 'image/jpeg');

        // Get gallery image dimensions
        const galleryMeta = await sharp(galleryBuffer).metadata();
        galleryWidth = galleryMeta.width || width;
        galleryHeight = galleryMeta.height || height;

        // Get gallery file size
        const galleryFileSize = galleryBuffer.length;
        
        // Generate description for gallery images if original longer side > 1200px
        const galleryDescription = longerSide > 1200 ? formatImageDescription(galleryWidth, galleryHeight, galleryFileSize) : null;

        // Insert gallery image into database
        let galleryRows: any;
        try {
          const result = await fileClient.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
             VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`,
            [actressId, galleryDbPath, galleryWidth, galleryHeight, file.type || 'image/jpeg', galleryFileSize, galleryDescription]
          );
          galleryRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
            await fileClient.query('ROLLBACK');
            // Reset sequence outside transaction
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
            const result = await fileClient.query(
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`,
              [actressId, galleryDbPath, galleryWidth, galleryHeight, file.type || 'image/jpeg', galleryFileSize, galleryDescription]
            );
            galleryRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }

        galleryImageId = galleryRows.rows[0]?.id;
      } else {
        // Image is <= 1500px, resize to gallery size (900px max) and save as gallery image only
        // If image is already <= 900px, keep original size
        galleryBuffer = buffer;
        let finalGalleryWidth = width;
        let finalGalleryHeight = height;
        
        if (longerSide > GALLERY_MAX_SIZE) {
          // Resize to 900px max on longer side
          let resizedImage = image
            .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
              fit: 'inside',
              withoutEnlargement: true,
            });
          
          // Get resized dimensions for watermark
          const tempBuffer = await resizedImage.toBuffer();
          const resizedMeta = await sharp(tempBuffer).metadata();
          finalGalleryWidth = resizedMeta.width || width;
          finalGalleryHeight = resizedMeta.height || height;
          
          // Create watermark using SVG (Vercel-compatible)
          const watermarkText = 'Glamour Girls of the Silver Screen';
          const watermarkSVG = createWatermarkSVG(watermarkText, finalGalleryWidth, finalGalleryHeight);
          
          // Composite watermark onto resized image
          galleryBuffer = Buffer.from(await resizedImage
            .composite([{
              input: watermarkSVG,
              top: 0,
              left: 0,
            }])
            .jpeg({ quality: 85 })
            .toBuffer());
        } else {
          // Image is already <= 900px, but still add watermark
          const watermarkText = 'Glamour Girls of the Silver Screen';
          const watermarkSVG = createWatermarkSVG(watermarkText, width, height);
          
          // Composite watermark onto original image
          galleryBuffer = Buffer.from(await image
            .composite([{
              input: watermarkSVG,
              top: 0,
              left: 0,
            }])
            .jpeg({ quality: 85 })
            .toBuffer());
          
          finalGalleryWidth = width;
          finalGalleryHeight = height;
        }
        
        const galleryFileName = `${baseFileName}${fileExt}`;
        galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;
        const galleryStoragePath = `${folderName}/${actressId}/${galleryFileName}`;
        
        // Upload gallery image to Supabase storage (glamourgirls_images bucket)
        await uploadToSupabase(supabase, 'glamourgirls_images', galleryStoragePath, galleryBuffer, 'image/jpeg');

        // Get gallery file size
        const galleryFileSize = galleryBuffer.length;
        
        // Generate description for gallery images if original longer side > 1200px
        const galleryDescription = longerSide > 1200 ? formatImageDescription(finalGalleryWidth, finalGalleryHeight, galleryFileSize) : null;

        // Insert gallery image into database
        let galleryRows: any;
        try {
          const result = await fileClient.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
             VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`,
            [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, file.type || 'image/jpeg', galleryFileSize, galleryDescription]
          );
          galleryRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
            await fileClient.query('ROLLBACK');
            // Reset sequence outside transaction
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
            const result = await fileClient.query(
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz, description) 
               VALUES ($1, $2, $3, $4, 4, $5, $6, $7) RETURNING id`,
              [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, file.type || 'image/jpeg', galleryFileSize, galleryDescription]
            );
            galleryRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }

        galleryImageId = galleryRows.rows[0]?.id;
      }

      // Create thumbnail (mytp = 3) from gallery image buffer
      // Use the gallery buffer we already have in memory
      const thumbnailBuffer = await sharp(galleryBuffer)
        .resize(200, 250, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const thumbFileName = `thumb${baseFileName}.jpg`;
      const thumbDbPath = `/${folderName}/${actressId}/${thumbFileName}`;
      const thumbStoragePath = `${folderName}/${actressId}/${thumbFileName}`;
      
      // Upload thumbnail to Supabase storage (glamourgirls_images bucket)
      await uploadToSupabase(supabase, 'glamourgirls_images', thumbStoragePath, thumbnailBuffer, 'image/jpeg');

      // Get thumbnail dimensions
      const thumbMeta = await sharp(thumbnailBuffer).metadata();

      // Get thumbnail file size
      const thumbFileSize = thumbnailBuffer.length;

        // Insert thumbnail into database
        let thumbRows: any;
        try {
          const result = await fileClient.query(
            `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
             VALUES ($1, $2, $3, $4, 3, $5, $6, $7) RETURNING id`,
            [actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbFileSize]
          );
          thumbRows = { rows: result.rows };
        } catch (insertError: any) {
          // If duplicate key error, rollback, reset sequence, and retry in new transaction
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
            console.warn(`Sequence conflict detected for images, rolling back and resetting sequence`);
            await fileClient.query('ROLLBACK');
            // Reset sequence outside transaction
            const maxIdResult = await fileClient.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM images`);
            const maxId = parseInt(maxIdResult.rows[0]?.max_id || '0');
            await fileClient.query(`SELECT setval('images_id_seq', $1, true)`, [maxId]);
            // Start new transaction and retry
            await fileClient.query('BEGIN');
            const result = await fileClient.query(
              `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 3, $5, $6, $7) RETURNING id`,
              [actressId, thumbDbPath, thumbMeta.width || 200, thumbMeta.height || 250, galleryImageId, 'image/jpeg', thumbFileSize]
            );
            thumbRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }

        const thumbId = thumbRows.rows[0]?.id;

        // Update gallery image with thumbnail ID
        await fileClient.query(
          `UPDATE images SET thumbid = $1 WHERE id = $2`,
          [thumbId, galleryImageId]
        );
        
        await fileClient.query('COMMIT');

        uploadedImages.push({
          id: galleryImageId,
          url: galleryDbPath,
          thumbnailUrl: thumbDbPath,
          width: galleryWidth,
          height: galleryHeight,
          hqId: hqImageId,
        });
      } catch (fileError: any) {
        try {
          await fileClient.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
        console.error(`Error processing file ${file.name}:`, fileError);
        const errorMsg = fileError?.message || 'Unknown error';
        // Check if it's a duplicate key error - this usually means a sequence conflict, not that the image exists
        if (errorMsg.includes('duplicate key') || errorMsg.includes('violates unique constraint')) {
          errors.push(`File "${file.name}": Database conflict occurred. Please try uploading again.`);
        } else {
          errors.push(`File "${file.name}": ${errorMsg}`);
        }
      } finally {
        fileClient.release();
      }
    }

    if (errors.length > 0 && uploadedImages.length === 0) {
      // All files failed
      return NextResponse.json(
        {
          error: 'Failed to upload images',
          details: errors.join('; '),
        },
        { status: 500 }
      );
    } else if (errors.length > 0) {
      // Some files succeeded, some failed
      return NextResponse.json({
        success: true,
        images: uploadedImages,
        message: `Successfully uploaded ${uploadedImages.length} image(s), ${errors.length} failed`,
        errors: errors,
      });
    }

    return NextResponse.json({ 
      success: true, 
      images: uploadedImages,
      message: `Successfully uploaded ${uploadedImages.length} image(s)`
    });
  } catch (error) {
    const err = error as any;
    console.error('Error uploading images:', err);
    return NextResponse.json(
      {
        error: 'Failed to upload images',
        details: err instanceof Error ? err.message : String(err || 'Unknown error'),
      },
      { status: 500 }
    );
  }
}

