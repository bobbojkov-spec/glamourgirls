import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/adminAuth';
import { requireAdmin } from '../_utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req, { role: 'super_admin' });
  if (error) return error;

  try {
    const { id, new_password } = await req.json();
    if (!id || !new_password) {
      return NextResponse.json({ error: 'id and new_password are required' }, { status: 400 });
    }
    const passwordHash = hashPassword(String(new_password));
    await pool.execute(
      `update public.admin_users set password_hash = ?, password_updated_at = now(), updated_at = now() where id = ?`,
      [passwordHash, id]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to reset password' }, { status: 500 });
  }
}


