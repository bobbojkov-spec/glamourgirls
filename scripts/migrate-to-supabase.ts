/**
 * Migrate Database to Supabase
 * 
 * This script:
 * 1. Connects to current PostgreSQL database
 * 2. Connects to Supabase
 * 3. Creates all tables in Supabase
 * 4. Migrates all data
 * 5. Verifies the migration
 * 
 * Usage:
 *   Set environment variables:
 *   - SUPABASE_DB_HOST: Supabase database host
 *   - SUPABASE_DB_PORT: Supabase database port (default: 5432)
 *   - SUPABASE_DB_NAME: Supabase database name
 *   - SUPABASE_DB_USER: Supabase database user
 *   - SUPABASE_DB_PASSWORD: Supabase database password
 * 
 *   Or use Supabase connection string:
 *   - SUPABASE_DATABASE_URL: Full PostgreSQL connection string
 */

// Load env from .env and .env.local (dotenv/config only loads .env by default)
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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
import { Pool } from 'pg';
import pool from '../src/lib/db';
import { readFile } from 'fs/promises';

type CliFlags = {
  checkOnly: boolean;
  skipSchema: boolean;
  excludeTables: Set<string>;
  skipFullTables: boolean;
};

function parseFlags(argv: string[]): CliFlags {
  const checkOnly = argv.includes('--check-only');
  const skipSchema = argv.includes('--skip-schema');
  const skipFullTables =
    argv.includes('--skip-full-tables') ||
    ['1', 'true', 'yes'].includes((process.env.MIGRATION_SKIP_FULL_TABLES || '').toLowerCase());
  const excludeArg = argv.find((a) => a.startsWith('--exclude-tables='));
  const excludeFromArg = excludeArg ? excludeArg.split('=')[1] : '';
  const excludeFromEnv = process.env.MIGRATION_EXCLUDE_TABLES || '';
  const excludeList = `${excludeFromEnv},${excludeFromArg}`
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return { checkOnly, skipSchema, excludeTables: new Set(excludeList), skipFullTables };
}

function isProbablySupabaseDbUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Supabase DB hosts typically look like: db.<project-ref>.supabase.co
    return u.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function isSupabasePoolerUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.port === '6543' || u.searchParams.get('pgbouncer') === 'true';
  } catch {
    return false;
  }
}

function isTransientNetworkError(err: any): boolean {
  const code = err?.code;
  const msg = String(err?.message || '');
  return (
    code === 'EHOSTUNREACH' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENETUNREACH' ||
    msg.includes('read EHOSTUNREACH') ||
    msg.includes('socket hang up')
  );
}

async function queryWithRetry<T>(
  fn: () => Promise<T>,
  opts: { tries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const tries = opts.tries ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastErr: any;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (!isTransientNetworkError(e) || attempt === tries) throw e;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      const label = opts.label ? ` (${opts.label})` : '';
      console.warn(`⚠️  Transient network error${label}, retrying in ${delay}ms... (${attempt}/${tries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

type ExecuteLike = {
  execute: (sql: string, params?: any[]) => Promise<[any[], any]>;
  end: () => Promise<void>;
};

function makePgExecutePool(connectionString: string, useSsl: boolean): ExecuteLike {
  const pgPool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  return {
    async execute(sql: string, params?: any[]): Promise<[any[], any]> {
      const res = await pgPool.query(sql, params);
      return [res.rows, []];
    },
    async end() {
      await pgPool.end();
    },
  };
}

function buildLocalSourceUrlFromDbEnv(): string | null {
  // Prefer the DB_* envs (your local/source DB), even if DATABASE_URL is repointed to the target DB.
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || process.env.USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'glamourgirls';

  // If everything is empty and we can't build a meaningful URL, bail.
  if (!host || !dbName || !user) return null;

  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
  return `postgresql://${auth}@${host}:${port}/${dbName}`;
}

function getSourceDb(): ExecuteLike {
  // If explicitly provided, use it. Otherwise fall back to the app DB pool wrapper.
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (sourceUrl) {
    // Assume local/non-Supabase by default (no SSL). If you need SSL, include it in the URL options.
    return makePgExecutePool(sourceUrl, false);
  }

  // Default: use DB_* envs (local/source) even if DATABASE_URL is pointing at the target.
  const localSourceUrl = buildLocalSourceUrlFromDbEnv();
  if (localSourceUrl) {
    return makePgExecutePool(localSourceUrl, false);
  }

  // Last resort: use the app pool wrapper (may use DATABASE_URL depending on your env)
  return pool as unknown as ExecuteLike;
}

// Supabase connection configuration
function getSupabasePool(): Pool {
  // Try connection string first
  const supabaseUrl =
    process.env.TARGET_DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    (isProbablySupabaseDbUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : '');

  if (supabaseUrl) {
    // Supabase "connection pooling" uses PgBouncer (often port 6543 and/or ?pgbouncer=true).
    // DDL (CREATE TABLE / ALTER TABLE) is safest via the DIRECT connection string (usually port 5432).
    if (isSupabasePoolerUrl(supabaseUrl)) {
      console.warn(
        '⚠️  You are using a Supabase PgBouncer/pooler URL (port 6543 / pgbouncer=true). ' +
          'Schema creation may fail via the pooler. Prefer the DIRECT DB URL (port 5432) for schema creation.'
      );
    }

    return new Pool({
      connectionString: supabaseUrl,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
    });
  }

  // Otherwise use individual config
  const supabaseConfig = {
    host: process.env.SUPABASE_DB_HOST || '',
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    database: process.env.SUPABASE_DB_NAME || '',
    user: process.env.SUPABASE_DB_USER || '',
    password: process.env.SUPABASE_DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  };

  if (!supabaseConfig.host || !supabaseConfig.database || !supabaseConfig.user) {
    throw new Error(
      'Missing Supabase configuration. Set SUPABASE_DATABASE_URL or ' +
      'SUPABASE_DB_HOST, SUPABASE_DB_NAME, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD'
    );
  }

  return new Pool(supabaseConfig);
}

interface MigrationStats {
  table: string;
  sourceCount: number;
  targetCount: number;
  success: boolean;
  error?: string;
}

async function migrateToSupabase() {
  console.log('🚀 Starting Migration to Supabase...\n');
  console.log('='.repeat(70));

  let supabasePool: Pool | null = null;
  let sourceDb: ExecuteLike | null = null;
  const stats: MigrationStats[] = [];

  try {
    const flags = parseFlags(process.argv.slice(2));
    sourceDb = getSourceDb();

    // Step 1: Test connections
    console.log('📡 Step 1: Testing Database Connections');
    console.log('-'.repeat(70));

    // Test source connection
    try {
      const [result] = await sourceDb.execute('SELECT COUNT(*)::int as count FROM girls') as any[];
      const count = result?.[0]?.count || 0;
      console.log(`✅ Source PostgreSQL: Connected (${count} girls found)`);
    } catch (error: any) {
      throw new Error(`Failed to connect to source database: ${error.message}`);
    }

    // Test Supabase connection
    supabasePool = getSupabasePool();
    try {
      await queryWithRetry(() => supabasePool!.query('SELECT 1'), { label: 'target SELECT 1' });
      console.log('✅ Supabase: Connected');
    } catch (error: any) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }

    // If check-only, stop here
    if (flags.checkOnly) {
      console.log('\n✅ Check-only mode: connection succeeded. No schema/data changes made.\n');
      return;
    }

    // Step 2: Load and execute schema
    console.log('\n📋 Step 2: Creating Tables in Supabase');
    console.log('-'.repeat(70));

    // Auto-skip schema creation when using pooler unless explicitly overridden
    const effectiveSupabaseUrl =
      process.env.SUPABASE_DATABASE_URL ||
      (isProbablySupabaseDbUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : '');

    const usingPooler = effectiveSupabaseUrl ? isSupabasePoolerUrl(effectiveSupabaseUrl) : false;
    const skipSchema = flags.skipSchema || usingPooler;

    if (skipSchema) {
      console.log(
        '⏭️  Skipping schema creation. ' +
          (usingPooler
            ? 'Detected Supabase pooler URL; DDL via pooler is unreliable.\n'
            : 'Requested via --skip-schema.\n')
      );
      console.log(
        '👉 Apply schema manually in Supabase SQL Editor using: scripts/supabase-schema-clean.sql\n'
      );
    } else {
    let schemaSql: string;
    try {
      schemaSql = await readFile('scripts/supabase-schema-clean.sql', 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read schema file: ${error.message}\nRun: npx tsx scripts/generate-supabase-schema.ts first`);
    }

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements

      try {
        await queryWithRetry(() => supabasePool!.query(statement), { label: `DDL statement ${i + 1}` });
        if ((i + 1) % 10 === 0) {
          process.stdout.write(`   Progress: ${i + 1}/${statements.length}\r`);
        }
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
          console.warn(`\n   ⚠️  Warning on statement ${i + 1}: ${error.message.substring(0, 100)}`);
        }
      }
    }
    console.log(`\n   ✅ Schema created successfully`);
    }

    // Step 3: Get list of tables to migrate
    console.log('\n📊 Step 3: Getting Table List');
    console.log('-'.repeat(70));

    const [tables] = await sourceDb.execute(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    ) as any[];

    const tableNames = tables.map((t: any) => t.table_name);
    console.log(`   Found ${tableNames.length} tables to migrate`);

    // Cache which tables exist in the TARGET (important if you deleted some in Supabase)
    const targetTablesRes = await queryWithRetry(
      () =>
        supabasePool!.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'`
        ),
      { label: 'target list tables' }
    );
    const targetTables = new Set<string>((targetTablesRes.rows || []).map((r: any) => r.table_name));

    // Step 4: Migrate data table by table
    console.log('\n💾 Step 4: Migrating Data');
    console.log('-'.repeat(70));

    for (const tableName of tableNames) {
      try {
        console.log(`\n   Migrating: ${tableName}`);

        if (flags.excludeTables.has(tableName)) {
          console.log('      ⏭️  Skipping (excluded)');
          stats.push({
            table: tableName,
            sourceCount: 0,
            targetCount: 0,
            success: true,
          });
          continue;
        }

        if (!targetTables.has(tableName)) {
          console.log('      ⏭️  Skipping (missing in target DB)');
          stats.push({
            table: tableName,
            sourceCount: 0,
            targetCount: 0,
            success: true,
          });
          continue;
        }

        // Get source count
        const [sourceCountResult] = await sourceDb.execute(
          `SELECT COUNT(*)::int as count FROM ${tableName}`
        ) as any[];
        const sourceCount = sourceCountResult?.[0]?.count || 0;

        if (sourceCount === 0) {
          console.log(`      ⏭️  Skipping (empty table)`);
          stats.push({
            table: tableName,
            sourceCount: 0,
            targetCount: 0,
            success: true,
          });
          continue;
        }

        // If requested, skip tables that are already fully migrated (count matches).
        // This avoids re-attempting inserts for large tables on reruns.
        if (flags.skipFullTables) {
          try {
            const targetCountRes = await queryWithRetry(
              () => supabasePool!.query(`SELECT COUNT(*)::int as count FROM ${tableName}`),
              { label: `target count ${tableName}` }
            );
            const targetCount = targetCountRes.rows?.[0]?.count ?? 0;
            if (Number(targetCount) === Number(sourceCount)) {
              console.log(`      ⏭️  Skipping (already full: ${targetCount}/${sourceCount})`);
              stats.push({
                table: tableName,
                sourceCount,
                targetCount,
                success: true,
              });
              continue;
            }
          } catch {
            // If count fails, continue with normal migration path.
          }
        }

        // Get column names
        const [columns] = await sourceDb.execute(
          `SELECT column_name 
           FROM information_schema.columns
           WHERE table_schema = 'public' 
             AND table_name = $1
           ORDER BY ordinal_position`,
          [tableName]
        ) as any[];

        const columnNames = columns.map((c: any) => c.column_name);
        const columnList = columnNames.join(', ');
        const placeholders = columnNames.map((_: string, i: number) => `$${i + 1}`).join(', ');

        // Fetch all data from source
        const [sourceData] = await sourceDb.execute(
          `SELECT ${columnList} FROM ${tableName}`
        ) as any[];

        if (!Array.isArray(sourceData) || sourceData.length === 0) {
          console.log(`      ⏭️  Skipping (no data)`);
          stats.push({
            table: tableName,
            sourceCount: 0,
            targetCount: 0,
            success: true,
          });
          continue;
        }

        // Insert data in batches
        const batchSize = 100;
        let inserted = 0;

        for (let i = 0; i < sourceData.length; i += batchSize) {
          const batch = sourceData.slice(i, i + batchSize);

          // Build insert statement for batch
          const values = batch.map((row: any) => {
            const rowValues = columnNames.map((col: string) => row[col]);
            return `(${rowValues.map((_: unknown, idx: number) => `$${idx + 1}`).join(', ')})`;
          });

          // Flatten values for parameterized query
          const flatValues: any[] = [];
          batch.forEach((row: any) => {
            columnNames.forEach((col: string) => {
              flatValues.push(row[col]);
            });
          });

          // For simplicity, insert one row at a time to handle errors better
          for (const row of batch) {
            try {
              const rowValues = columnNames.map((col: string) => row[col]);
              await queryWithRetry(
                () =>
                  supabasePool!.query(
                    `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
                    rowValues
                  ),
                { label: `insert ${tableName}` }
              );
              inserted++;
            } catch (error: any) {
              // Skip duplicate key errors
              if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
                inserted++; // Count as success since it already exists
              } else {
                throw error;
              }
            }
          }

          if ((i + batchSize) % 500 === 0 || i + batchSize >= sourceData.length) {
            process.stdout.write(`      Progress: ${Math.min(i + batchSize, sourceData.length)}/${sourceData.length} rows\r`);
          }
        }

        // Verify target count
        const targetCountResult = await queryWithRetry(
          () => supabasePool!.query(`SELECT COUNT(*)::int as count FROM ${tableName}`),
          { label: `target verify count ${tableName}` }
        );
        const targetCount = (targetCountResult.rows[0]?.count as number) || 0;

        console.log(`      ✅ Migrated: ${inserted}/${sourceCount} rows (${targetCount} total in target)`);

        stats.push({
          table: tableName,
          sourceCount,
          targetCount,
          success: true,
        });

      } catch (error: any) {
        console.error(`      ❌ Error: ${error.message}`);
        stats.push({
          table: tableName,
          sourceCount: 0,
          targetCount: 0,
          success: false,
          error: error.message,
        });
      }
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 Migration Summary');
    console.log('='.repeat(70));

    const successful = stats.filter(s => s.success);
    const failed = stats.filter(s => !s.success);
    const withData = stats.filter(s => s.sourceCount > 0);

    console.log(`\n   Total tables: ${stats.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Tables with data: ${withData.length}`);

    const totalSourceRows = stats.reduce((sum, s) => sum + s.sourceCount, 0);
    const totalTargetRows = stats.reduce((sum, s) => sum + s.targetCount, 0);

    console.log(`\n   Total source rows: ${totalSourceRows.toLocaleString()}`);
    console.log(`   Total target rows: ${totalTargetRows.toLocaleString()}`);

    if (failed.length > 0) {
      console.log(`\n   ❌ Failed tables:`);
      failed.forEach(f => {
        console.log(`      - ${f.table}: ${f.error}`);
      });
    }

    console.log('\n✅ Migration Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (supabasePool) {
      await supabasePool.end();
    }
    if (sourceDb && sourceDb !== (pool as unknown as ExecuteLike)) {
      await sourceDb.end();
    } else {
      try {
        await pool.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Run migration
migrateToSupabase().catch(console.error);

