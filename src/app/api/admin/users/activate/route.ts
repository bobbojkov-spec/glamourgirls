import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '../_utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req, { role: 'super_admin' });
  if (error) return error;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await pool.execute(`update public.admin_users set is_active = true, updated_at = now() where id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to activate user' }, { status: 500 });
  }
}


