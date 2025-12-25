import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  generateSixDigitCode,
  getClientIp,
  getOtpExpiryIso,
  getTrustedCookie,
  hashOtpCode,
  isValidEmail,
  trustedDeviceHash,
  verifyPassword,
  createAdminSession,
  getSessionCookieOptions,
} from '@/lib/adminAuth';
import { sendAdminLoginCodeEmail } from '@/lib/email/sendAdminLoginCode';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, device_fingerprint }: { email?: string; password?: string; device_fingerprint?: string } =
      await req.json();

    const emailNorm = email?.toLowerCase().trim();
    const passwordTrimmed = password?.trim();
    if (!emailNorm || !passwordTrimmed) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (!isValidEmail(emailNorm)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Query using lowercase email (emailNorm is already lowercase)
    // Use ILIKE for case-insensitive matching in PostgreSQL, or exact match with lower()
    const [rows] = await pool.execute(
      `select id, email, password_hash, role, is_active from public.admin_users where lower(trim(email)) = lower(trim(?)) limit 1`,
      [emailNorm]
    );
    const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as any) : null;
    
    if (!user) {
      console.error(`Login attempt failed: User not found for email: ${emailNorm}`);
      // Try to find any users with similar email for debugging
      try {
        const [allUsers] = await pool.execute(`select email from public.admin_users limit 10`) as any[];
        console.error(`Available admin emails: ${allUsers?.map((u: any) => u.email).join(', ') || 'none'}`);
      } catch (e) {
        // Ignore debug query errors
      }
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    if (!user.is_active) {
      console.error(`Login attempt failed: User inactive for email: ${emailNorm}`);
      return NextResponse.json({ error: 'Account is inactive' }, { status: 401 });
    }

    // Verify password
    const passwordHash = String(user.password_hash || '').trim();
    if (!passwordHash) {
      console.error(`Login attempt failed: No password hash found for email: ${emailNorm}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if hash format is valid (should start with 'scrypt$')
    if (!passwordHash.startsWith('scrypt$')) {
      console.error(`Login attempt failed: Invalid password hash format for email: ${emailNorm}`);
      console.error(`Hash format: ${passwordHash.substring(0, 50)}...`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = verifyPassword(passwordTrimmed, passwordHash);
    if (!ok) {
      console.error(`Login attempt failed: Password verification failed for email: ${emailNorm}`);
      // Log hash format for debugging (first 50 chars only)
      const hashPreview = passwordHash.substring(0, 50);
      console.error(`Stored hash format: ${hashPreview}... (length: ${passwordHash.length})`);
      console.error(`Password length provided: ${passwordTrimmed?.length || 0}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    console.log(`Login successful for email: ${emailNorm}, role: ${user.role}`);

    const device = device_fingerprint || 'unknown';
    const trustCookie = getTrustedCookie(req);
    if (trustCookie && trustCookie === trustedDeviceHash(emailNorm, device)) {
      // Trusted device: issue session immediately
      const session = await createAdminSession({
        adminUserId: String(user.id),
        userAgent: req.headers.get('user-agent'),
        ipAddress: getClientIp(req),
      });
      await pool.execute(`update public.admin_users set last_login_at = now(), updated_at = now() where id = ?`, [user.id]);

      const res = NextResponse.json({ trusted: true, message: 'Trusted device; logged in.' });
      res.cookies.set({ name: 'admin_session', value: session.token, ...getSessionCookieOptions() });
      return res;
    }

    // Not trusted: generate OTP and email it
    const code = generateSixDigitCode();
    const codeHash = hashOtpCode(code);
    const expiresAt = getOtpExpiryIso();

    await pool.execute(
      `insert into public.admin_login_codes(email, code_hash, device_fingerprint, expires_at) values(?, ?, ?, ?)`,
      [emailNorm, codeHash, device_fingerprint || null, expiresAt]
    );

    let emailSent = false;
    try {
      await sendAdminLoginCodeEmail(emailNorm, code, expiresAt);
      emailSent = true;
    } catch (e: any) {
      // allow dev fallback: code can be exposed with env flag
      console.warn('Admin login code email failed:', e?.message || e);
    }

    return NextResponse.json({
      message: emailSent ? 'Authentication code sent to your email.' : 'Authentication code generated.',
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}


