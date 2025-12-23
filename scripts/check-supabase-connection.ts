/**
 * Check Supabase DB connection (non-destructive).
 *
 * Loads .env and .env.local, then attempts to connect using:
 * - SUPABASE_DATABASE_URL (preferred)
 * - else DATABASE_URL (if it looks like a Supabase DB URL)
 *
 * Usage:
 *   npx tsx scripts/check-supabase-connection.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

function loadEnvFile(filePath: string, override: boolean) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  // Support lines like: export KEY=value
  const normalized = raw.replace(/^\s*export\s+/gm, '');
  const parsed = dotenv.parse(normalized);
  for (const [k, v] of Object.entries(parsed)) {
    if (override || process.env[k] === undefined) {
      process.env[k] = v;
    }
  }
}

loadEnvFile(path.join(process.cwd(), '.env'), false);
loadEnvFile(path.join(process.cwd(), '.env.local'), true);

function isProbablySupabaseDbUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function maskUrl(url: string): string {
  return url.replace(/:\/\/(.*?):(.*?)@/, '://$1:***@');
}

async function main() {
  const url =
    process.env.TARGET_DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    (isProbablySupabaseDbUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : '');

  if (!url) {
    throw new Error(
      'No target DB URL found. Set TARGET_DATABASE_URL (recommended) or SUPABASE_DATABASE_URL, or DATABASE_URL pointing at *.supabase.co'
    );
  }

  console.log('Using DB URL (masked):', maskUrl(url));

  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    const r1 = await pool.query('select 1 as ok');
    const r2 = await pool.query('select current_database() as db, current_user as usr');
    const r3 = await pool.query('select version() as version');
    console.log('✅ Connected');
    console.log('  select1:', r1.rows[0]);
    console.log('  whoami:', r2.rows[0]);
    console.log('  version:', r3.rows[0].version);

    // Check if DB is "empty" (no user tables in public schema)
    const tablesRes = await pool.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`
    );
    const tableNames = tablesRes.rows.map((r: any) => r.table_name as string);
    console.log(`  tables(public): ${tableNames.length}`);
    if (tableNames.length === 0) {
      console.log('✅ Target DB looks EMPTY (no public tables).');
    } else {
      console.log('⚠️ Target DB is NOT empty. First tables:', tableNames.slice(0, 10).join(', '));
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Supabase connection failed:', e.message);
  process.exit(1);
});


