import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Public endpoint to fetch current hero image path
export async function GET(request: NextRequest) {
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
    // Return null if table doesn't exist yet (graceful degradation)
    return NextResponse.json({
      success: true,
      heroImagePath: null,
    });
  }
}

