import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  createAdminSession,
  getClientIp,
  getSessionCookieOptions,
  getTrustCookieOptions,
  hashOtpCode,
  isValidEmail,
  trustedDeviceHash,
} from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, code, device_fingerprint }: { email?: string; code?: string; device_fingerprint?: string } =
      await req.json();

    const emailNorm = email?.toLowerCase().trim();
    if (!emailNorm || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }
    if (!isValidEmail(emailNorm)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const codeHash = hashOtpCode(code);

    const [codeRows] = await pool.execute(
      `
      select id, email
      from public.admin_login_codes
      where email = ?
        and code_hash = ?
        and expires_at > ?
        and used_at is null
      order by created_at desc
      limit 1
      `,
      [emailNorm, codeHash, nowIso]
    );
    const match = Array.isArray(codeRows) ? (codeRows[0] as any) : null;
    if (!match) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    await pool.execute(`update public.admin_login_codes set used_at = ? where id = ?`, [nowIso, match.id]);

    // Find the admin user to attach the session
    const [userRows] = await pool.execute(
      `select id, is_active from public.admin_users where lower(email) = lower(?) limit 1`,
      [emailNorm]
    );
    const user = Array.isArray(userRows) ? (userRows[0] as any) : null;
    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Admin not found or not active' }, { status: 401 });
    }

    const session = await createAdminSession({
      adminUserId: String(user.id),
      userAgent: req.headers.get('user-agent'),
      ipAddress: getClientIp(req),
    });
    await pool.execute(`update public.admin_users set last_login_at = now(), updated_at = now() where id = ?`, [user.id]);

    const res = NextResponse.json({ success: true });

    // Session cookie
    res.cookies.set({ name: 'admin_session', value: session.token, ...getSessionCookieOptions() });

    // Trusted-device cookie (skips OTP next time on this device)
    const device = device_fingerprint || 'unknown';
    res.cookies.set({ name: 'admin_trusted', value: trustedDeviceHash(emailNorm, device), ...getTrustCookieOptions() });

    return res;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}


