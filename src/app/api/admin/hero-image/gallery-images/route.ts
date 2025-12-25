import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

// GET - Fetch available gallery images for hero image selection
export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch gallery images (mytp = 4) with actress information
    const [rows] = await pool.execute(
      `SELECT 
         i.id,
         i.path,
         i.width,
         i.height,
         i.girlid,
         g.nm as actress_name,
         g.firstname,
         g.familiq
       FROM images i
       JOIN girls g ON i.girlid = g.id
       WHERE i.mytp = 4
         AND i.path IS NOT NULL
         AND i.path != ''
         AND i.width > 0
         AND i.height > 0
         AND g.published = 2
       ORDER BY i.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ) as any[];

    const images = rows.map((row: any) => ({
      id: row.id,
      path: row.path,
      width: row.width,
      height: row.height,
      actressId: row.girlid,
      actressName: row.actress_name || `${row.firstname || ''} ${row.familiq || ''}`.trim(),
    }));

    return NextResponse.json({
      success: true,
      images,
      count: images.length,
    });
  } catch (error: any) {
    console.error('Error fetching gallery images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gallery images', details: error.message },
      { status: 500 }
    );
  }
}

