import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import pool, { getPool } from '@/lib/db';
import { createCanvas } from 'canvas';
import { requireAdminApi } from '@/app/api/admin/_auth';

// Helper function to create watermark using canvas with fixed width
async function createWatermarkCanvas(text: string, imageWidth: number, imageHeight: number): Promise<Buffer> {
  const targetTextWidth = 475; // Target width between 450-500px
  const canvas = createCanvas(imageWidth, imageHeight);
  const ctx = canvas.getContext('2d');
  
  // Find the right font size to achieve target text width
  let fontSize = 24; // Start with a reasonable size
  let textWidth = 0;
  let iterations = 0;
  const maxIterations = 20;
  
  // Binary search to find font size that gives us ~475px width
  let minSize = 12;
  let maxSize = 72;
  
  while (iterations < maxIterations) {
    fontSize = Math.floor((minSize + maxSize) / 2);
    ctx.font = `${fontSize}px "Brush Script MT", "Brush Script", "Lucida Handwriting", cursive`;
    const metrics = ctx.measureText(text);
    textWidth = metrics.width;
    
    if (Math.abs(textWidth - targetTextWidth) < 5) {
      break; // Close enough
    }
    
    if (textWidth < targetTextWidth) {
      minSize = fontSize + 1;
    } else {
      maxSize = fontSize - 1;
    }
    
    iterations++;
  }
  
  // Set final font
  ctx.font = `${fontSize}px "Brush Script MT", "Brush Script", "Lucida Handwriting", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Set text color with transparency (80-90% opacity for better readability)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'; // Darker shadow for better contrast
  ctx.lineWidth = 0.8;
  
  // Draw text with stroke for better visibility
  const x = imageWidth / 2;
  const y = imageHeight - 15;
  
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  
  return canvas.toBuffer('image/png');
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

      // Determine folder (use newpic for new uploads, or check if securepic exists)
      const folderName = 'newpic'; // Default to newpic
      const actressFolder = path.join(process.cwd(), 'public', folderName, actressId.toString());
      
      // Create folder if it doesn't exist
      await mkdir(actressFolder, { recursive: true });

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

      // If longer side > 1500px, save original as HQ and create resized gallery image
      if (longerSide > HQ_THRESHOLD) {
        // Save original as HQ (mytp = 5)
        const hqFileName = `${baseFileName}_hq${fileExt}`;
        const hqPath = path.join(actressFolder, hqFileName);
        await writeFile(hqPath, buffer);
        const hqDbPath = `/${folderName}/${actressId}/${hqFileName}`;
        
        // Get file size in bytes
        const hqFileSize = buffer.length;

        // Insert HQ image into database
        let hqRows: any;
        try {
          const result = await fileClient.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
             VALUES ($1, $2, $3, $4, 5, $5, $6) RETURNING id`,
            [actressId, hqDbPath, width, height, file.type || 'image/jpeg', hqFileSize]
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
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 5, $5, $6) RETURNING id`,
              [actressId, hqDbPath, width, height, file.type || 'image/jpeg', hqFileSize]
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
        
        // Create watermark using canvas for better font support
        const watermarkText = 'www.GlamourGirlsOftheSilverScreen.com';
        const watermarkBuffer = await createWatermarkCanvas(watermarkText, resizedWidth, resizedHeight);
        
        // Composite watermark onto gallery image
        const galleryBuffer = await galleryImage
          .composite([{
            input: watermarkBuffer,
            top: 0,
            left: 0,
          }])
          .jpeg({ quality: 85 })
          .toBuffer();

        const galleryFileName = `${baseFileName}${fileExt}`;
        const galleryPath = path.join(actressFolder, galleryFileName);
        await writeFile(galleryPath, galleryBuffer);
        galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;

        // Get gallery image dimensions
        const galleryMeta = await sharp(galleryBuffer).metadata();
        galleryWidth = galleryMeta.width || width;
        galleryHeight = galleryMeta.height || height;

        // Get gallery file size
        const galleryFileSize = galleryBuffer.length;

        // Insert gallery image into database
        let galleryRows: any;
        try {
          const result = await fileClient.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
             VALUES ($1, $2, $3, $4, 4, $5, $6) RETURNING id`,
            [actressId, galleryDbPath, galleryWidth, galleryHeight, file.type || 'image/jpeg', galleryFileSize]
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
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 4, $5, $6) RETURNING id`,
              [actressId, galleryDbPath, galleryWidth, galleryHeight, file.type || 'image/jpeg', galleryFileSize]
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
        let galleryBuffer = buffer;
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
          
          // Create watermark using canvas for better font support
          const watermarkText = 'Glamour Girls of the Silver Screen';
          const watermarkBuffer = await createWatermarkCanvas(watermarkText, finalGalleryWidth, finalGalleryHeight);
          
          // Composite watermark onto resized image
          galleryBuffer = Buffer.from(await resizedImage
            .composite([{
              input: watermarkBuffer,
              top: 0,
              left: 0,
            }])
            .jpeg({ quality: 85 })
            .toBuffer());
        } else {
          // Image is already <= 900px, but still add watermark
          const watermarkText = 'Glamour Girls of the Silver Screen';
          const watermarkBuffer = await createWatermarkCanvas(watermarkText, width, height);
          
          // Composite watermark onto original image
          galleryBuffer = Buffer.from(await image
            .composite([{
              input: watermarkBuffer,
              top: 0,
              left: 0,
            }])
            .jpeg({ quality: 85 })
            .toBuffer());
          
          finalGalleryWidth = width;
          finalGalleryHeight = height;
        }
        
        const galleryFileName = `${baseFileName}${fileExt}`;
        const galleryPath = path.join(actressFolder, galleryFileName);
        await writeFile(galleryPath, galleryBuffer);
        galleryDbPath = `/${folderName}/${actressId}/${galleryFileName}`;

        // Get gallery file size
        const galleryFileSize = galleryBuffer.length;

        // Insert gallery image into database
        let galleryRows: any;
        try {
          const result = await fileClient.query(
            `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
             VALUES ($1, $2, $3, $4, 4, $5, $6) RETURNING id`,
            [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, file.type || 'image/jpeg', galleryFileSize]
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
              `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
               VALUES ($1, $2, $3, $4, 4, $5, $6) RETURNING id`,
              [actressId, galleryDbPath, finalGalleryWidth, finalGalleryHeight, file.type || 'image/jpeg', galleryFileSize]
            );
            galleryRows = { rows: result.rows };
          } else {
            throw insertError;
          }
        }

        galleryImageId = galleryRows.rows[0]?.id;
      }

      // Create thumbnail (mytp = 3) from gallery image
      // Read the saved gallery image file (which is already resized to 900px max if needed)
      const galleryImageBuffer = await sharp(path.join(actressFolder, `${baseFileName}${fileExt}`)).toBuffer();
      
      const thumbnailBuffer = await sharp(galleryImageBuffer)
        .resize(200, 250, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      const thumbFileName = `thumb${baseFileName}.jpg`;
      const thumbPath = path.join(actressFolder, thumbFileName);
      await writeFile(thumbPath, thumbnailBuffer);
      const thumbDbPath = `/${folderName}/${actressId}/${thumbFileName}`;

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

