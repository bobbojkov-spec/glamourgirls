import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
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

    // Look for headshot2 image in database
    let headshotImage: { path: string; width: number; height: number } | null = null;

    try {
      const [headshotResults] = await pool.execute(
        `SELECT path, width, height 
         FROM images 
         WHERE girlid = ? 
           AND path IS NOT NULL 
           AND path != ''
           AND (
             path ILIKE '%headshot2%' 
             OR path ILIKE '%headshot_2%'
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
      console.error('Error checking for headshot2 in database:', dbError);
    }

    // If we found a headshot2 image, fetch it from Supabase Storage
    if (headshotImage && headshotImage.path) {
      try {
        const imageBuffer = await fetchFromStorage(headshotImage.path);
        
        if (imageBuffer) {
          const headers: HeadersInit = {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Image-Width': headshotImage.width.toString(),
            'X-Image-Height': headshotImage.height.toString(),
          };

          return new NextResponse(new Uint8Array(imageBuffer), { headers });
        }
      } catch (fetchError) {
        console.error(`Error fetching headshot2 from storage for actress ${actressId}:`, fetchError);
        // Fall through to placeholder
      }
    }

    // Fallback to regular headshot if headshot2 not found
    try {
      const [headshotResults] = await pool.execute(
        `SELECT path, width, height 
         FROM images 
         WHERE girlid = ? 
           AND path IS NOT NULL 
           AND path != ''
           AND path ILIKE '%headshot%'
         LIMIT 1`,
        [actressId]
      ) as any[];

      if (Array.isArray(headshotResults) && headshotResults.length > 0) {
        const imageBuffer = await fetchFromStorage(headshotResults[0].path);
        
        if (imageBuffer) {
          const headers: HeadersInit = {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Image-Width': (headshotResults[0].width || 0).toString(),
            'X-Image-Height': (headshotResults[0].height || 0).toString(),
          };

          return new NextResponse(new Uint8Array(imageBuffer), { headers });
        }
      }
    } catch (error) {
      console.error('Error fetching fallback headshot:', error);
    }

    // Return placeholder
    return NextResponse.json({ error: 'Headshot2 image not found' }, { status: 404 });
  } catch (error) {
    console.error('Error processing headshot2:', error);
    return NextResponse.json(
      { error: 'Failed to process headshot2' },
      { status: 500 }
    );
  }
}

