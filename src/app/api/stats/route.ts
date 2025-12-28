import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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

    return NextResponse.json({
      totalEntries,
      totalImages,
      totalHQImages,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      totalEntries: 0,
      totalImages: 0,
      totalHQImages: 0,
    });
  }
}


