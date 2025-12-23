import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '../_utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const [rows] = await pool.execute(
      `select id, email, role, is_active, created_at, last_login_at
       from public.admin_users
       order by created_at desc`
    );
    return NextResponse.json({ users: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load admin users' }, { status: 500 });
  }
}


