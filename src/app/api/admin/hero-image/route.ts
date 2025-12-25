import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

// GET - Fetch current hero image path
export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    const [rows] = await pool.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'hero_image_path'`
    ) as any[];

    const heroImagePath = rows?.[0]?.setting_value || null;

    return NextResponse.json({
      success: true,
      heroImagePath,
    });
  } catch (error: any) {
    console.error('Error fetching hero image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hero image', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update hero image path
export async function PUT(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { imagePath } = body;

    if (typeof imagePath !== 'string' && imagePath !== null) {
      return NextResponse.json(
        { error: 'Invalid imagePath. Must be a string or null.' },
        { status: 400 }
      );
    }

    // Update or insert the setting
    await pool.execute(
      `INSERT INTO site_settings (setting_key, setting_value, updated_at)
       VALUES ('hero_image_path', ?, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP`,
      [imagePath, imagePath]
    );

    return NextResponse.json({
      success: true,
      heroImagePath: imagePath,
    });
  } catch (error: any) {
    console.error('Error updating hero image:', error);
    return NextResponse.json(
      { error: 'Failed to update hero image', details: error.message },
      { status: 500 }
    );
  }
}

