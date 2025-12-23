import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    let total = 0;
    try {
      const [countRows] = await pool.execute(`select count(*)::int as total from public.admin_users`);
      total = Array.isArray(countRows) ? Number((countRows as any)[0]?.total || 0) : 0;
    } catch (e: any) {
      const msg = String(e?.message || '');
      // If table doesn't exist, there are no admins
      if (msg.toLowerCase().includes('admin_users') && msg.toLowerCase().includes('does not exist')) {
        total = 0;
      } else {
        throw e;
      }
    }

    return NextResponse.json({ hasAdmins: total > 0, count: total });
  } catch (error: any) {
    console.error('Error checking admin users:', error);
    // On error, assume no admins exist (safer to show setup message)
    return NextResponse.json({ hasAdmins: false, count: 0 });
  }
}


