/**
 * Check Why Tables Weren't Migrated to Supabase
 * 
 * Compares source schema with target schema to see which tables are missing
 * 
 * Usage:
 *   npx tsx scripts/check-why-tables-not-migrated.ts
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
  throw new Error('No source DB configured.');
}

function getTargetUrl(): string {
  const url =
    process.env.TARGET_DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    (isProbablySupabaseDbUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : '');
  if (!url) throw new Error('No target DB configured.');
  return url;
}

async function getAllTables(pool: Pool): Promise<string[]> {
  const res = await pool.query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`
  );
  return res.rows.map((r: any) => r.table_name);
}

async function getTableRowCount(pool: Pool, table: string): Promise<number> {
  try {
    const res = await pool.query(`select count(*)::int as c from ${table}`);
    return res.rows[0]?.c ?? 0;
  } catch {
    return -1;
  }
}

async function main() {
  console.log('🔍 Checking Why Tables Weren\'t Migrated\n');
  console.log('='.repeat(80));

  const sourceUrl = getSourceUrl();
  const targetUrl = getTargetUrl();

  const source = new Pool({ connectionString: sourceUrl, ssl: undefined });
  const target = new Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  try {
    const sourceTables = await getAllTables(source);
    const targetTables = await getAllTables(target);
    const targetTableSet = new Set(targetTables);

    console.log(`\n📊 Source tables: ${sourceTables.length}`);
    console.log(`📊 Target tables: ${targetTables.length}\n`);

    const missingTables = sourceTables.filter(t => !targetTableSet.has(t));
    const extraTables = targetTables.filter(t => !sourceTables.includes(t));

    if (missingTables.length > 0) {
      console.log(`\n❌ Tables in SOURCE but NOT in TARGET (${missingTables.length}):\n`);
      
      for (const table of missingTables) {
        const rowCount = await getTableRowCount(source, table);
        const inSchema = fs.readFileSync('scripts/supabase-schema-clean.sql', 'utf8').includes(`CREATE TABLE IF NOT EXISTS ${table}`);
        
        console.log(`  ${table.padEnd(30)} Rows: ${rowCount.toString().padStart(10)} ${inSchema ? '✅ In schema' : '❌ NOT in schema'}`);
      }
    }

    if (extraTables.length > 0) {
      console.log(`\n➕ Tables in TARGET but NOT in SOURCE (${extraTables.length}):\n`);
      for (const table of extraTables) {
        console.log(`  ${table}`);
      }
    }

    // Check if tables are in the schema file
    console.log('\n' + '='.repeat(80));
    console.log('\n📄 Checking schema file (scripts/supabase-schema-clean.sql):\n');
    
    const schemaContent = fs.readFileSync('scripts/supabase-schema-clean.sql', 'utf8');
    
    for (const table of missingTables) {
      const inSchema = schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`);
      if (!inSchema) {
        console.log(`  ❌ ${table} - NOT in schema file`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Analysis:\n');
    console.log('  Tables missing from target could be because:');
    console.log('  1. They were not included in the schema file');
    console.log('  2. Schema creation failed during migration');
    console.log('  3. They were intentionally excluded');
    console.log('  4. Migration script skipped them (empty tables, etc.)\n');

  } catch (e: any) {
    console.error('\n❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((e) => {
  console.error('❌ Script failed:', e.message);
  process.exit(1);
});

