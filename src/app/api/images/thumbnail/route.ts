import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');
    const width = parseInt(searchParams.get('width') || '200');
    const height = parseInt(searchParams.get('height') || '250');

    if (!imagePath) {
      return NextResponse.json({ error: 'Image path required' }, { status: 400 });
    }

    // Normalize the supplied path. Support absolute URLs by grabbing the pathname.
    let normalizedPath = imagePath;
    if (/^https?:\/\//i.test(imagePath)) {
      try {
        const url = new URL(imagePath);
        normalizedPath = url.pathname || '';
      } catch (err) {
        console.error('Invalid image URL provided to thumbnail API:', err);
        return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
      }
    }

    // Remove leading slash and construct full path
    const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
    const publicDir = path.resolve(process.cwd(), 'public');
    const fullPath = path.resolve(publicDir, cleanPath);

    // Ensure the resolved file stays within the public directory
    if (
      !fullPath.startsWith(`${publicDir}${path.sep}`) &&
      fullPath !== publicDir
    ) {
      return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
    }

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Read and process image with Sharp
    const imageBuffer = await fs.readFile(fullPath);
    const fileExt = path.extname(fullPath).toLowerCase();
    
    // Create sharp instance and get metadata
    let sharpInstance = sharp(imageBuffer);
    const metadata = await sharpInstance.metadata();
    
    // Resize with high quality settings for sharp thumbnails
    // Use 'inside' to maintain aspect ratio, ensuring height matches exactly
    sharpInstance = sharpInstance.resize(width, height, {
      fit: 'inside', // Maintain aspect ratio, fit inside dimensions
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3, // High-quality resampling for sharp results
    });
    
    // Convert to JPEG for thumbnails with optimal quality settings
    // Higher quality and sharpening for crisp thumbnails
    const thumbnail = await sharpInstance
      .sharpen() // Apply default sharpening for crisp thumbnails
      .jpeg({ 
        quality: 95, // Higher quality for sharper thumbnails
        mozjpeg: true, // Better compression algorithm
        progressive: true, // Progressive JPEG for better perceived quality
      })
      .toBuffer();

    // Return optimized thumbnail
    return new NextResponse(new Uint8Array(thumbnail), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate thumbnail' },
      { status: 500 }
    );
  }
}
