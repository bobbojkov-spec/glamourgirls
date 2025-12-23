import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import pool from '@/lib/db';

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

    // Check both newpic and securepic folders
    const folders = [
      path.join(process.cwd(), 'public', 'newpic', id.toString()),
      path.join(process.cwd(), 'public', 'securepic', id.toString()),
    ];

    let headshotPath: string | null = null;
    let sourceGifPath: string | null = null;

    // First, check if headshot.jpg already exists
    for (const folder of folders) {
      const headshotJpg = path.join(folder, 'headshot.jpg');
      try {
        await fs.access(headshotJpg);
        headshotPath = headshotJpg;
        break;
      } catch {
        // File doesn't exist, continue
      }
    }

      // If headshot.jpg doesn't exist, find the headshot GIF, PNG, or JPG and process it
      if (!headshotPath) {
        for (const folder of folders) {
          try {
            const files = await fs.readdir(folder);
            // Look for GIF, PNG, and JPG files - the headshot is usually the portrait-oriented one
            const imageFiles = files.filter(f => {
              const ext = f.toLowerCase();
              return ext.endsWith('.gif') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg');
            });
            
            for (const imageFile of imageFiles) {
              const imagePath = path.join(folder, imageFile);
              const metadata = await sharp(imagePath).metadata();
              
              // Headshot is typically portrait-oriented (height > width)
              if (metadata.height && metadata.width && metadata.height > metadata.width) {
                sourceGifPath = imagePath;
                headshotPath = path.join(folder, 'headshot.jpg');
                break;
              }
            }
            
            if (sourceGifPath) break;
          } catch {
            // Folder doesn't exist, continue
          }
        }

        if (!sourceGifPath) {
          // Check if this is a "their men" entry - if so, return placeholder
          try {
            const [results] = await pool.execute(
              `SELECT theirman FROM girls WHERE id = ? AND published = 2`,
              [actressId]
            ) as any[];
            
            if (Array.isArray(results) && results.length > 0 && Boolean(results[0].theirman) === true) {
              // Return placeholder for "their men" entries
              const placeholderPath = path.join(process.cwd(), 'public', 'images', 'placeholder-man-portrait.png');
              try {
                const placeholderBuffer = await fs.readFile(placeholderPath);
                const placeholderMetadata = await sharp(placeholderBuffer).metadata();
                
                const headers: HeadersInit = {
                  'Content-Type': 'image/png',
                  'Cache-Control': 'public, max-age=31536000, immutable',
                };
                
                if (placeholderMetadata.width && placeholderMetadata.height) {
                  headers['X-Image-Width'] = placeholderMetadata.width.toString();
                  headers['X-Image-Height'] = placeholderMetadata.height.toString();
                }
                
                return new NextResponse(placeholderBuffer, { headers });
              } catch (placeholderError) {
                console.error('Error reading placeholder image:', placeholderError);
                // Fall through to 404
              }
            }
          } catch (dbError) {
            console.error('Error checking theirman status:', dbError);
            // Fall through to 404
          }
          
          return NextResponse.json({ error: 'Headshot image not found' }, { status: 404 });
        }

        // Process the image: crop 40px from top, 40px from bottom, 25px from left, 28px from right
        const imageBuffer = await fs.readFile(sourceGifPath);
        const metadata = await sharp(imageBuffer).metadata();
        
        if (!metadata.width || !metadata.height) {
          return NextResponse.json({ error: 'Invalid image dimensions' }, { status: 500 });
        }

        const left = 25;
        const top = 40;
        const width = metadata.width - 53; // 25px from left, 28px from right
        const height = metadata.height - 80; // 40px from top and bottom

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

        // Save as headshot.jpg
        if (!headshotPath) {
          return NextResponse.json({ error: 'Headshot path not resolved' }, { status: 500 });
        }
        await fs.writeFile(headshotPath, processedImage);
      }

    // Return the processed image with dimensions in headers
    if (!headshotPath) {
      return NextResponse.json({ error: 'Headshot image not found' }, { status: 404 });
    }
    const imageBuffer = await fs.readFile(headshotPath);
    const headshotMetadata = await sharp(imageBuffer).metadata();
    
    const headers: HeadersInit = {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    };
    
    if (headshotMetadata.width && headshotMetadata.height) {
      headers['X-Image-Width'] = headshotMetadata.width.toString();
      headers['X-Image-Height'] = headshotMetadata.height.toString();
    }
    
    return new NextResponse(imageBuffer, { headers });
  } catch (error) {
    console.error('Error processing headshot:', error);
    return NextResponse.json(
      { error: 'Failed to process headshot' },
      { status: 500 }
    );
  }
}

