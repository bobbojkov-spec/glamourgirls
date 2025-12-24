import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { fetchFromStorage } from '@/lib/supabase/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');
    const width = parseInt(searchParams.get('width') || '200');
    const height = parseInt(searchParams.get('height') || '250');

    if (!imagePath) {
      return NextResponse.json({ error: 'Image path required' }, { status: 400 });
    }

    // If already a full URL (Supabase Storage URL), fetch directly
    let imageBuffer: Buffer | null = null;
    
    if (/^https?:\/\//i.test(imagePath)) {
      try {
        const response = await fetch(imagePath);
        if (!response.ok) {
          return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } catch (err) {
        console.error('Error fetching image from URL:', err);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
      }
    } else {
      // Database path - fetch from Supabase Storage
      imageBuffer = await fetchFromStorage(imagePath);
      
      if (!imageBuffer) {
        return NextResponse.json({ error: 'Image not found in storage' }, { status: 404 });
      }
    }

    // Process image with Sharp
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
