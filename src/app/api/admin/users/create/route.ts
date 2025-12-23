import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, isValidEmail, type AdminRole } from '@/lib/adminAuth';
import { requireAdmin } from '../_utils';

export const runtime = 'nodejs';

async function ensureAdminAuthSchema() {
  // Best-effort: if the DB user lacks privileges, the caller will receive the error.
  await pool.execute(`create extension if not exists pgcrypto`);

  await pool.execute(`
    create table if not exists public.admin_users (
      id uuid primary key default gen_random_uuid(),
      email text not null,
      password_hash text not null,
      role text not null default 'admin',
      is_active boolean not null default true,
      last_login_at timestamptz null,
      password_updated_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.execute(`create unique index if not exists admin_users_email_uq on public.admin_users(lower(email))`);
  await pool.execute(`create index if not exists admin_users_active_idx on public.admin_users(is_active)`);

  await pool.execute(`
    create table if not exists public.admin_login_codes (
      id uuid primary key default gen_random_uuid(),
      email text not null,
      code_hash text not null,
      device_fingerprint text null,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null,
      used_at timestamptz null
    )
  `);
  await pool.execute(`create index if not exists admin_login_codes_email_idx on public.admin_login_codes(email)`);
  await pool.execute(`create index if not exists admin_login_codes_expires_idx on public.admin_login_codes(expires_at)`);

  await pool.execute(`
    create table if not exists public.admin_sessions (
      id uuid primary key default gen_random_uuid(),
      admin_user_id uuid not null references public.admin_users(id) on delete cascade,
      token_hash text not null,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null,
      revoked_at timestamptz null,
      user_agent text null,
      ip_address text null
    )
  `);
  await pool.execute(`create unique index if not exists admin_sessions_token_hash_uq on public.admin_sessions(token_hash)`);
  await pool.execute(`create index if not exists admin_sessions_admin_user_id_idx on public.admin_sessions(admin_user_id)`);
  await pool.execute(`create index if not exists admin_sessions_expires_idx on public.admin_sessions(expires_at)`);
}

export async function POST(req: NextRequest) {
  try {
    // Allow first-user bootstrap without auth if table is empty.
    let total = 0;
    try {
      const [countRows] = await pool.execute(`select count(*)::int as total from public.admin_users`);
      total = Array.isArray(countRows) ? Number((countRows as any)[0]?.total || 0) : 0;
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.toLowerCase().includes('admin_users') && msg.toLowerCase().includes('does not exist')) {
        await ensureAdminAuthSchema();
        const [countRows] = await pool.execute(`select count(*)::int as total from public.admin_users`);
        total = Array.isArray(countRows) ? Number((countRows as any)[0]?.total || 0) : 0;
      } else {
        throw e;
      }
    }

    if (total > 0) {
      const { error } = await requireAdmin(req, { role: 'super_admin' });
      if (error) return error;
    }

    const body = await req.json();
    const email = String(body?.email || '').toLowerCase().trim();
    const password = String(body?.password || '');
    const role = String(body?.role || 'admin') as AdminRole;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    await pool.execute(
      `insert into public.admin_users(email, password_hash, role, is_active) values(?, ?, ?, true)`,
      [email, passwordHash, role]
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = String(e?.message || 'Failed to create admin user');
    const code = e?.code ? String(e.code) : '';
    const detail = code ? `${code}: ${msg}` : msg;
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}


