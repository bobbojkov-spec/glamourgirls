import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Pre-cached search metadata endpoint
 * Returns total actresses, photos, and HQ images counts
 * This endpoint is cached with a long TTL to avoid database queries on each request
 */
export async function GET() {
  try {
    // Get total published girls count
    const [girlsCountResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM girls
       WHERE published = 2`
    ) as any[];

    // Get images counts by type
    // HQ count only includes HQ images that have a matching gallery image
    const [imagesCountResult] = await pool.execute(
      `SELECT 
        COUNT(CASE WHEN i.mytp = 4 THEN 1 END) as gallery,
        COUNT(CASE 
          WHEN i.mytp = 5 AND EXISTS (
            SELECT 1 FROM images i2 
            WHERE i2.girlid = i.girlid 
              AND i2.mytp = 4 
              AND (i2.id = i.id - 1 OR i2.id = i.id + 1)
          ) 
          THEN 1 
        END) as hq
       FROM images i
       WHERE i.mytp IN (4, 5)`
    ) as any[];

    const totalEntries = girlsCountResult && girlsCountResult.length > 0 
      ? Number(girlsCountResult[0].total) || 0 
      : 0;
    
    const totalImages = imagesCountResult && imagesCountResult.length > 0
      ? Number(imagesCountResult[0].gallery) || 0
      : 0;
    
    const totalHQImages = imagesCountResult && imagesCountResult.length > 0
      ? Number(imagesCountResult[0].hq) || 0
      : 0;

    const metadata = {
      totalEntries,
      totalImages,
      totalHQImages,
    };

    // Return with long cache headers
    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour, stale for 24 hours
      },
    });
  } catch (error: any) {
    console.error('Error fetching search metadata:', error);
    
    // Return default values on error (still cacheable)
    const defaultMetadata = {
      totalEntries: 0,
      totalImages: 0,
      totalHQImages: 0,
    };

    return NextResponse.json(defaultMetadata, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Shorter cache on error
      },
    });
  }
}

