import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import pool from '@/lib/db';

export type AdminRole = 'admin' | 'super_admin';

export type AdminSessionUser = {
  id: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
};

const SESSION_COOKIE = 'admin_session';
const TRUST_COOKIE = 'admin_trusted';

const SESSION_TTL_DAYS = Number(process.env.ADMIN_SESSION_TTL_DAYS || 14);
const TRUST_TTL_DAYS = Number(process.env.ADMIN_TRUST_TTL_DAYS || 30);

const CODE_TTL_MINUTES = Number(process.env.ADMIN_LOGIN_CODE_TTL_MINUTES || 10);
export const EXPOSE_LOGIN_CODE = process.env.EXPOSE_LOGIN_CODE === 'true';

type ScryptParams = { N: number; r: number; p: number; keyLen: number };
const DEFAULT_SCRYPT: ScryptParams = { N: 16384, r: 8, p: 1, keyLen: 32 };

export function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function hashOtpCode(code: string) {
  return sha256Hex(code);
}

export function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function getOtpExpiryIso() {
  return new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
}

export function trustedDeviceHash(email: string, deviceFingerprint: string) {
  return sha256Hex(`${email}:${deviceFingerprint || 'unknown'}`);
}

export function hashPassword(password: string, params: ScryptParams = DEFAULT_SCRYPT) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, params.keyLen, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: 64 * 1024 * 1024,
  });
  const saltB64 = salt.toString('base64');
  const hashB64 = Buffer.from(derivedKey).toString('base64');
  return `scrypt$N=${params.N},r=${params.r},p=${params.p},len=${params.keyLen}$${saltB64}$${hashB64}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [scheme, paramStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const matchN = /N=(\d+)/.exec(paramStr);
    const matchR = /r=(\d+)/.exec(paramStr);
    const matchP = /p=(\d+)/.exec(paramStr);
    const matchLen = /len=(\d+)/.exec(paramStr);
    const params: ScryptParams = {
      N: Number(matchN?.[1] || DEFAULT_SCRYPT.N),
      r: Number(matchR?.[1] || DEFAULT_SCRYPT.r),
      p: Number(matchP?.[1] || DEFAULT_SCRYPT.p),
      keyLen: Number(matchLen?.[1] || DEFAULT_SCRYPT.keyLen),
    };
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = crypto.scryptSync(password, salt, params.keyLen, {
      N: params.N,
      r: params.r,
      p: params.p,
      maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function randomSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function getSessionCookie(req: NextRequest) {
  return req.cookies.get(SESSION_COOKIE)?.value || null;
}

export function getTrustedCookie(req: NextRequest) {
  return req.cookies.get(TRUST_COOKIE)?.value || null;
}

export function getClientIp(req: NextRequest) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  return req.headers.get('x-real-ip') || null;
}

export async function createAdminSession(opts: {
  adminUserId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  const token = randomSessionToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await pool.execute(
    `insert into public.admin_sessions(admin_user_id, token_hash, expires_at, user_agent, ip_address)
     values(?, ?, ?, ?, ?)`,
    [opts.adminUserId, tokenHash, expiresAt, opts.userAgent || null, opts.ipAddress || null]
  );
  return { token, tokenHash, expiresAt };
}

export async function getAdminFromSession(req: NextRequest): Promise<AdminSessionUser | null> {
  const token = getSessionCookie(req);
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const nowIso = new Date().toISOString();

  const [rows] = await pool.execute(
    `
    select u.id, u.email, u.role, u.is_active
    from public.admin_sessions s
    join public.admin_users u on u.id = s.admin_user_id
    where s.token_hash = ?
      and s.revoked_at is null
      and s.expires_at > ?
    limit 1
    `,
    [tokenHash, nowIso]
  );

  const row = Array.isArray(rows) ? (rows[0] as any) : null;
  if (!row) return null;
  if (!row.is_active) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    role: (row.role as AdminRole) || 'admin',
    is_active: Boolean(row.is_active),
  };
}

export function isRoleAllowed(role: AdminRole, required: AdminRole) {
  if (required === 'admin') return role === 'admin' || role === 'super_admin';
  return role === 'super_admin';
}

export function getCookieOptions(maxAgeDays: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60,
  };
}

export function getSessionCookieOptions() {
  return getCookieOptions(SESSION_TTL_DAYS);
}

export function getTrustCookieOptions() {
  return getCookieOptions(TRUST_TTL_DAYS);
}


