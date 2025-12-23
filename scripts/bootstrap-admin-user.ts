import crypto from 'crypto';
import pool from '../src/lib/db';

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function usage() {
  // eslint-disable-next-line no-console
  console.log(
    [
      'Usage:',
      '  tsx scripts/bootstrap-admin-user.ts --email you@example.com --password "secret" --role super_admin',
      '',
      'Notes:',
      '- Requires DATABASE_URL (or DB_HOST/DB_* envs) to be configured.',
      "- Role must be 'admin' or 'super_admin'.",
    ].join('\n')
  );
}

type ScryptParams = { N: number; r: number; p: number; keyLen: number };

const DEFAULT_SCRYPT: ScryptParams = { N: 16384, r: 8, p: 1, keyLen: 32 };

function hashPassword(password: string, params: ScryptParams = DEFAULT_SCRYPT) {
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

async function ensureTablesExist() {
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
}

async function main() {
  const email = arg('email')?.toLowerCase().trim();
  const password = arg('password');
  const role = (arg('role') || 'super_admin').toLowerCase();

  if (!email || !password) {
    usage();
    process.exit(1);
  }
  if (!['admin', 'super_admin'].includes(role)) {
    // eslint-disable-next-line no-console
    console.error(`Invalid role: ${role}`);
    process.exit(1);
  }

  await ensureTablesExist();

  const passwordHash = hashPassword(password);

  const [existing] = await pool.execute(`select id from public.admin_users where lower(email) = lower(?) limit 1`, [email]);
  const exists = Array.isArray(existing) && existing.length > 0;
  if (exists) {
    // eslint-disable-next-line no-console
    console.log(`Admin already exists for ${email}`);
    process.exit(0);
  }

  await pool.execute(
    `insert into public.admin_users(email, password_hash, role, is_active) values(?, ?, ?, true)`,
    [email, passwordHash, role]
  );

  // eslint-disable-next-line no-console
  console.log(`Created admin user: ${email} (${role})`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


