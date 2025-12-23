import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionCookie, sha256Hex } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const token = getSessionCookie(req);
    if (token) {
      const tokenHash = sha256Hex(token);
      await pool.execute(`update public.admin_sessions set revoked_at = now() where token_hash = ? and revoked_at is null`, [
        tokenHash,
      ]);
    }
  } catch (e) {
    // best-effort revoke; still clear cookies
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({ name: 'admin_session', value: '', maxAge: 0, path: '/' });
  res.cookies.set({ name: 'admin_trusted', value: '', maxAge: 0, path: '/' });
  return res;
}


