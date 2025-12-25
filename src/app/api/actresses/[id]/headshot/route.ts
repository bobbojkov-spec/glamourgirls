import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import pool from '@/lib/db';
import { fetchFromStorage } from '@/lib/supabase/storage';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actressId = parseInt(id);

    if (isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    // First, check if there's a headshot.jpg in the database images table
    // Look for images with path ending in 'headshot.jpg' or named 'headshot'
    let headshotImage: { path: string; width: number; height: number } | null = null;

    try {
      const [headshotResults] = await pool.execute(
        `SELECT path, width, height 
         FROM images 
         WHERE girlid = ? 
           AND path IS NOT NULL 
           AND path != ''
           AND (
             path ILIKE '%headshot.jpg' 
             OR path ILIKE '%headshot.jpeg'
             OR path ILIKE '%headshot.png'
           )
         LIMIT 1`,
        [actressId]
      ) as any[];

      if (Array.isArray(headshotResults) && headshotResults.length > 0) {
        headshotImage = {
          path: headshotResults[0].path,
          width: headshotResults[0].width || 0,
          height: headshotResults[0].height || 0,
        };
      }
    } catch (dbError) {
      console.error('Error checking for headshot in database:', dbError);
    }

    // If no explicit headshot found, look for portrait-oriented gallery images (mytp = 4)
    if (!headshotImage) {
      try {
        const [portraitResults] = await pool.execute(
          `SELECT path, width, height 
           FROM images 
           WHERE girlid = ? 
             AND mytp = 4
             AND path IS NOT NULL 
             AND path != ''
             AND width > 0 
             AND height > 0
             AND height > width
           ORDER BY id ASC
           LIMIT 1`,
          [actressId]
        ) as any[];

        if (Array.isArray(portraitResults) && portraitResults.length > 0) {
          headshotImage = {
            path: portraitResults[0].path,
            width: portraitResults[0].width || 0,
            height: portraitResults[0].height || 0,
          };
        }
      } catch (dbError) {
        console.error('Error checking for portrait images:', dbError);
      }
    }

    // If we found a headshot image in the database, fetch it from Supabase Storage
    if (headshotImage && headshotImage.path) {
      try {
        const imageBuffer = await fetchFromStorage(headshotImage.path);
        
        if (imageBuffer) {
          // Check if this is already processed (headshot.jpg) or needs processing
          const needsProcessing = !headshotImage.path.toLowerCase().includes('headshot.jpg');
          
          let finalBuffer = imageBuffer;
          let finalWidth = headshotImage.width;
          let finalHeight = headshotImage.height;

          if (needsProcessing) {
            // Process headshot to exact size: 190px width × 245px height
            // Rule: Make height 245px, crop width to 190px (centered)
            // If image is smaller, resize to height 245px (blow up), then crop width to 190px
            const TARGET_WIDTH = 190;
            const TARGET_HEIGHT = 245;
            const metadata = await sharp(imageBuffer).metadata();
            
            if (metadata.width && metadata.height) {
              // Step 1: Resize height to 225px (maintain aspect ratio, allow enlarging if smaller)
              let processedImage = sharp(imageBuffer).resize(null, TARGET_HEIGHT, {
                fit: 'inside',
                withoutEnlargement: false, // Allow enlarging smaller images
              });
              
              // Step 2: Get dimensions after height resize
              const resizedBuffer = await processedImage.toBuffer();
              const resizedMeta = await sharp(resizedBuffer).metadata();
              const resizedWidth = resizedMeta.width || TARGET_WIDTH;
              
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
                // If width is smaller, resize to exact dimensions (cover mode)
                processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
                  fit: 'cover', // Cover the area, may crop
                });
              }

              // Convert to JPEG
              finalBuffer = await processedImage
                .jpeg({ quality: 90, mozjpeg: true })
                .toBuffer();

              const finalMetadata = await sharp(finalBuffer).metadata();
              finalWidth = finalMetadata.width || TARGET_WIDTH;
              finalHeight = finalMetadata.height || TARGET_HEIGHT;
            }
          }

          const headers: HeadersInit = {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Image-Width': finalWidth.toString(),
            'X-Image-Height': finalHeight.toString(),
          };

          return new NextResponse(new Uint8Array(finalBuffer), { headers });
        }
      } catch (fetchError) {
        console.error(`Error fetching headshot from storage for actress ${actressId}:`, fetchError);
        // Fall through to placeholder
      }
    }

    // No headshot found - return appropriate placeholder
    try {
      const [results] = await pool.execute(
        `SELECT theirman FROM girls WHERE id = ? AND published = 2`,
        [actressId]
      ) as any[];

      let placeholderPath: string;
      if (Array.isArray(results) && results.length > 0 && Boolean(results[0].theirman) === true) {
        // Return placeholder for "their men" entries
        placeholderPath = path.join(process.cwd(), 'public', 'images', 'placeholder-man-portrait.png');
      } else {
        // Return default placeholder for regular actresses
        placeholderPath = path.join(process.cwd(), 'public', 'images', 'placeholder-portrait.png');
      }

      try {
        const placeholderBuffer = await fs.readFile(placeholderPath);
        const placeholderMetadata = await sharp(placeholderBuffer).metadata();

        const headers: HeadersInit = {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        };

        if (placeholderMetadata.width && placeholderMetadata.height) {
          headers['X-Image-Width'] = placeholderMetadata.width.toString();
          headers['X-Image-Height'] = placeholderMetadata.height.toString();
        }

        return new NextResponse(new Uint8Array(placeholderBuffer), { headers });
      } catch (placeholderError) {
        console.error('Error reading placeholder image:', placeholderError);
        // Fall through to generated placeholder
      }
    } catch (dbError) {
      console.error('Error checking theirman status:', dbError);
      // Fall through to generated placeholder
    }

    // Last resort: generate a simple gray placeholder
    try {
      const placeholderBuffer = await sharp({
        create: {
          width: 200,
          height: 250,
          channels: 3,
          background: { r: 220, g: 220, b: 220 }
        }
      })
      .png()
      .toBuffer();

      return new NextResponse(new Uint8Array(placeholderBuffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'X-Image-Width': '200',
          'X-Image-Height': '250',
        }
      });
    } catch (generateError) {
      console.error('Error generating placeholder:', generateError);
      return NextResponse.json({ error: 'Headshot image not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error processing headshot:', error);
    return NextResponse.json(
      { error: 'Failed to process headshot' },
      { status: 500 }
    );
  }
}

