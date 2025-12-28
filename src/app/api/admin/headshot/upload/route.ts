import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { createClient } from '@supabase/supabase-js';
import pool from '@/lib/db';

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

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const formData = await request.formData();
    const actressId = parseInt(formData.get('actressId') as string);
    const file = formData.get('headshot') as File;

    if (!actressId || isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get image metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid image dimensions' }, { status: 400 });
    }

    // Initialize Supabase client (REQUIRED)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing. Cannot upload headshot.' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Determine folder (check if securepic has images, otherwise use newpic)
    let folderName = 'newpic'; // Default to newpic
    
    // Check if securepic folder has images in Supabase
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

    // Process headshot to exact size: 190px width × 245px height
    // Rule: Make height 245px, crop width to 190px (centered)
    // If image is smaller, resize to height 245px (blow up), then crop width to 190px
    const TARGET_WIDTH = 190;
    const TARGET_HEIGHT = 245;
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid image dimensions' }, { status: 400 });
    }
    
    let processedImage = image;
    
    // Step 1: Resize height to 225px (maintain aspect ratio, allow enlarging if smaller)
    processedImage = image.resize(null, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: false, // Allow enlarging smaller images
    });
    
    // Step 2: Get dimensions after height resize
    const resizedBuffer = await processedImage.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    const resizedWidth = resizedMeta.width || TARGET_WIDTH;
    const resizedHeight = resizedMeta.height || TARGET_HEIGHT;
    
    // Step 3: Crop width to 180px (centered) if needed
    if (resizedWidth > TARGET_WIDTH) {
      const cropLeft = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
      processedImage = sharp(resizedBuffer).extract({
        left: cropLeft,
        top: 0,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });
    } else if (resizedWidth < TARGET_WIDTH) {
      // If width is smaller, we need to resize again to fit width (shouldn't happen with proper aspect)
      // But just in case, resize to exact dimensions
      processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover', // Cover the area, may crop
      });
    }
    // If exactly 180px, no crop needed

    // Convert to JPEG
    const headshotBuffer = await processedImage
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    // Upload to Supabase storage (glamourgirls_images bucket)
    const headshotDbPath = `/${folderName}/${actressId}/headshot.jpg`;
    const headshotStoragePath = `${folderName}/${actressId}/headshot.jpg`;
    await uploadToSupabase(supabase, 'glamourgirls_images', headshotStoragePath, headshotBuffer, 'image/jpeg');

    // Get final dimensions
    const finalMetadata = await sharp(headshotBuffer).metadata();
    const finalWidth = finalMetadata.width || TARGET_WIDTH;
    const finalHeight = finalMetadata.height || TARGET_HEIGHT;

    // IMPORTANT: Persist a matching DB record so `/api/actresses/:id/headshot` can find it.
    // Convention: headshots are stored as mytp = 3 (same as other scripts in this repo).
    try {
      const [existingRows] = await pool.execute(
        `SELECT id FROM images 
         WHERE girlid = ? 
           AND path IS NOT NULL 
           AND path != '' 
           AND (path ILIKE '%headshot.jpg' OR path ILIKE '%headshot.jpeg' OR path ILIKE '%headshot.png')
         ORDER BY id ASC
         LIMIT 1`,
        [actressId]
      ) as any[];

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        const existingId = Number(existingRows[0].id);
        await pool.execute(
          `UPDATE images 
           SET path = ?, width = ?, height = ?, mytp = 3, mimetype = ?, sz = ?
           WHERE id = ?`,
          [headshotDbPath, finalWidth, finalHeight, 'image/jpeg', String(headshotBuffer.length), existingId]
        );
      } else {
        await pool.execute(
          `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz)
           VALUES (?, ?, ?, ?, 3, ?, ?)`,
          [actressId, headshotDbPath, finalWidth, finalHeight, 'image/jpeg', String(headshotBuffer.length)]
        );
      }
    } catch (dbErr: any) {
      // Upload succeeded; DB write failing would make the headshot not visible.
      // Return a 500 so the admin sees a failure and can retry, rather than "success but not visible".
      console.error('[Headshot Upload] Failed to upsert images row:', dbErr);
      return NextResponse.json(
        { error: 'Headshot uploaded to storage, but failed to update database', details: dbErr?.message || String(dbErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Headshot uploaded and processed successfully',
      path: headshotDbPath,
      width: finalWidth,
      height: finalHeight,
    });
  } catch (error) {
    console.error('Error uploading headshot:', error);
    return NextResponse.json(
      { error: 'Failed to upload headshot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

