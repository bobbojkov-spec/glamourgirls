import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actressId = parseInt(id);

    if (isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    // Track view - insert into views table or update views count
    // First, check if views table exists, if not, we'll use a views column in girls table
    try {
      // Try to insert into views_log table (for detailed tracking)
      await pool.execute(
        `INSERT INTO views_log (girlid, viewed_at) VALUES (?, NOW())`,
        [actressId]
      );
    } catch (error: any) {
      // If views_log table doesn't exist, update views count in girls table
      if (error.code === 'ER_NO_SUCH_TABLE') {
        // Update views count in girls table
        await pool.execute(
          `UPDATE girls SET views = COALESCE(views, 0) + 1 WHERE id = ?`,
          [actressId]
        );
      } else {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking view:', error);
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

