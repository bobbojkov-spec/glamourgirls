/**
 * Verify migration by comparing row counts between source and target DBs.
 *
 * Source:
 * - SOURCE_DATABASE_URL (if set), else DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME (local)
 *
 * Target:
 * - TARGET_DATABASE_URL (preferred), else SUPABASE_DATABASE_URL, else DATABASE_URL if it looks like *.supabase.co
 *
 * Usage:
 *   cd /Users/borislavbojkov/dev/gg26
 *   npx tsx scripts/verify-migration.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

function loadEnvFile(filePath: string, override: boolean) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
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

function buildLocalSourceUrlFromDbEnv(): string | null {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || process.env.USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'glamourgirls';
  if (!host || !dbName || !user) return null;
  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
  return `postgresql://${auth}@${host}:${port}/${dbName}`;
}

function getSourceUrl(): string {
  if (process.env.SOURCE_DATABASE_URL) return process.env.SOURCE_DATABASE_URL;
  const local = buildLocalSourceUrlFromDbEnv();
  if (local) return local;
  throw new Error('No source DB configured. Set SOURCE_DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.');
}

function getTargetUrl(): string {
  const url =
    process.env.TARGET_DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    (isProbablySupabaseDbUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : '');
  if (!url) throw new Error('No target DB configured. Set TARGET_DATABASE_URL (preferred) or SUPABASE_DATABASE_URL.');
  return url;
}

async function tableCount(pool: Pool, table: string): Promise<number> {
  const res = await pool.query(`select count(*)::int as c from ${table}`);
  return res.rows[0]?.c ?? 0;
}

async function main() {
  const sourceUrl = getSourceUrl();
  const targetUrl = getTargetUrl();

  console.log('Source (masked):', maskUrl(sourceUrl));
  console.log('Target (masked):', maskUrl(targetUrl));

  const source = new Pool({ connectionString: sourceUrl, ssl: undefined });
  const target = new Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  const tablesToCheck = [
    'girls',
    'images',
    'girlinfos',
    'girlinfos2',
    'girllinks',
    'members',
    'related_actresses',
  ];

  try {
    await source.query('select 1');
    await target.query('select 1');

    console.log('\nCounts:');
    let mismatches = 0;
    for (const t of tablesToCheck) {
      try {
        const [sc, tc] = await Promise.all([tableCount(source, t), tableCount(target, t)]);
        const ok = sc === tc;
        if (!ok) mismatches++;
        console.log(`- ${t}: source=${sc.toLocaleString()} target=${tc.toLocaleString()} ${ok ? 'OK' : 'MISMATCH'}`);
      } catch (e: any) {
        mismatches++;
        console.log(`- ${t}: ERROR (${e.message})`);
      }
    }

    console.log('');
    if (mismatches === 0) {
      console.log('✅ Verification passed (counts match for all checked tables).');
    } else {
      console.log(`⚠️ Verification found ${mismatches} issue(s). Check the table(s) above.`);
    }
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((e) => {
  console.error('❌ Verify failed:', e.message);
  process.exit(1);
});






