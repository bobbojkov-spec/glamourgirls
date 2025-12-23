-- Admin auth schema for Glamour Girls (email+password + 6-digit email code + sessions)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

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
);

create unique index if not exists admin_users_email_uq on public.admin_users(lower(email));
create index if not exists admin_users_active_idx on public.admin_users(is_active);

create table if not exists public.admin_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  device_fingerprint text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz null
);

create index if not exists admin_login_codes_email_idx on public.admin_login_codes(email);
create index if not exists admin_login_codes_expires_idx on public.admin_login_codes(expires_at);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  user_agent text null,
  ip_address text null
);

create unique index if not exists admin_sessions_token_hash_uq on public.admin_sessions(token_hash);
create index if not exists admin_sessions_admin_user_id_idx on public.admin_sessions(admin_user_id);
create index if not exists admin_sessions_expires_idx on public.admin_sessions(expires_at);


