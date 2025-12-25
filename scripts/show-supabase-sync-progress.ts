/**
 * Show Supabase Synchronization Progress
 * 
 * This script shows the current progress of:
 * 1. Database table migration (source vs target row counts)
 * 2. Image upload status (if available)
 * 
 * Usage:
 *   npx tsx scripts/show-supabase-sync-progress.ts
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

function maskUrl(url: string): string {
  return url.replace(/:\/\/(.*?):(.*?)@/, '://$1:***@');
}

async function tableCount(pool: Pool, table: string): Promise<number> {
  try {
    const res = await pool.query(`select count(*)::int as c from ${table}`);
    return res.rows[0]?.c ?? 0;
  } catch (e: any) {
    if (e.message?.includes('does not exist') || e.message?.includes('relation')) {
      return -1; // Table doesn't exist
    }
    throw e;
  }
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

interface TableProgress {
  table: string;
  sourceCount: number;
  targetCount: number;
  status: 'complete' | 'partial' | 'missing' | 'error' | 'not_in_target';
  percentage: number;
  error?: string;
}

function formatNumber(n: number): string {
  if (n === -1) return 'N/A';
  return n.toLocaleString();
}

function getStatusIcon(status: TableProgress['status']): string {
  switch (status) {
    case 'complete': return '✅';
    case 'partial': return '⚠️';
    case 'missing': return '❌';
    case 'not_in_target': return '⏭️';
    case 'error': return '🔴';
    default: return '❓';
  }
}

async function main() {
  console.log('📊 Supabase Synchronization Progress Report\n');
  console.log('='.repeat(80));

  const sourceUrl = getSourceUrl();
  const targetUrl = getTargetUrl();

  console.log('\n🔗 Connections:');
  console.log(`   Source: ${maskUrl(sourceUrl)}`);
  console.log(`   Target: ${maskUrl(targetUrl)}`);

  const source = new Pool({ connectionString: sourceUrl, ssl: undefined });
  const target = new Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  try {
    // Test connections
    await source.query('select 1');
    await target.query('select 1');
    console.log('\n✅ Both connections successful\n');

    // Get all tables from source
    const sourceTables = await getAllTables(source);
    console.log(`📋 Found ${sourceTables.length} tables in source database\n`);

    // Get all tables from target
    const targetTables = await getAllTables(target);
    const targetTableSet = new Set(targetTables);

    // Check progress for each table
    const progress: TableProgress[] = [];
    const importantTables = [
      'girls',
      'images',
      'girlinfos',
      'girllinks',
    ];
    
    // Tables that don't exist in target and should be excluded from checks
    const excludedTables = [
      'girlinfos2',
      'members',
      'related_actresses',
    ];

    // Check important tables first
    for (const table of importantTables) {
      if (!sourceTables.includes(table)) continue;
      if (excludedTables.includes(table)) continue; // Skip excluded tables

      try {
        const sourceCount = await tableCount(source, table);
        let targetCount = -1;
        let status: TableProgress['status'] = 'error';
        let error: string | undefined;

        if (targetTableSet.has(table)) {
          try {
            targetCount = await tableCount(target, table);
            if (sourceCount === targetCount) {
              status = 'complete';
            } else if (targetCount > 0) {
              status = 'partial';
            } else {
              status = 'missing';
            }
          } catch (e: any) {
            error = e.message;
            status = 'error';
          }
        } else {
          status = 'not_in_target';
        }

        const percentage = sourceCount > 0 && targetCount >= 0 
          ? Math.round((targetCount / sourceCount) * 100) 
          : status === 'complete' ? 100 : 0;

        progress.push({
          table,
          sourceCount,
          targetCount,
          status,
          percentage,
          error,
        });
      } catch (e: any) {
        progress.push({
          table,
          sourceCount: -1,
          targetCount: -1,
          status: 'error',
          percentage: 0,
          error: e.message,
        });
      }
    }

    // Check other tables
    for (const table of sourceTables) {
      if (importantTables.includes(table)) continue;
      if (excludedTables.includes(table)) continue; // Skip excluded tables

      try {
        const sourceCount = await tableCount(source, table);
        let targetCount = -1;
        let status: TableProgress['status'] = 'error';

        if (targetTableSet.has(table)) {
          try {
            targetCount = await tableCount(target, table);
            if (sourceCount === targetCount) {
              status = 'complete';
            } else if (targetCount > 0) {
              status = 'partial';
            } else {
              status = 'missing';
            }
          } catch {
            status = 'error';
          }
        } else {
          status = 'not_in_target';
        }

        const percentage = sourceCount > 0 && targetCount >= 0 
          ? Math.round((targetCount / sourceCount) * 100) 
          : status === 'complete' ? 100 : 0;

        progress.push({
          table,
          sourceCount,
          targetCount,
          status,
          percentage,
        });
      } catch {
        // Skip tables that can't be counted
      }
    }

    // Display results
    console.log('📊 Database Migration Status:\n');
    console.log('─'.repeat(80));
    console.log(
      `${'Table'.padEnd(25)} ${'Source'.padStart(12)} ${'Target'.padStart(12)} ${'Status'.padStart(10)} ${'Progress'.padStart(10)}`
    );
    console.log('─'.repeat(80));

    // Show important tables first
    const importantProgress = progress.filter(p => importantTables.includes(p.table));
    const otherProgress = progress.filter(p => !importantTables.includes(p.table));

    for (const p of [...importantProgress, ...otherProgress]) {
      const statusText = p.status === 'complete' ? 'Complete' :
                        p.status === 'partial' ? 'Partial' :
                        p.status === 'missing' ? 'Missing' :
                        p.status === 'not_in_target' ? 'Not in Target' :
                        'Error';
      const icon = getStatusIcon(p.status);
      const progressText = p.status === 'complete' ? '100%' :
                          p.status === 'partial' ? `${p.percentage}%` :
                          p.status === 'not_in_target' ? 'N/A' :
                          '0%';

      console.log(
        `${icon} ${p.table.padEnd(23)} ${formatNumber(p.sourceCount).padStart(12)} ${formatNumber(p.targetCount).padStart(12)} ${statusText.padStart(10)} ${progressText.padStart(10)}`
      );
    }

    // Summary statistics
    console.log('\n' + '─'.repeat(80));
    const complete = progress.filter(p => p.status === 'complete').length;
    const partial = progress.filter(p => p.status === 'partial').length;
    const missing = progress.filter(p => p.status === 'missing').length;
    const notInTarget = progress.filter(p => p.status === 'not_in_target').length;
    const errors = progress.filter(p => p.status === 'error').length;

    const totalSourceRows = progress
      .filter(p => p.sourceCount > 0)
      .reduce((sum, p) => sum + p.sourceCount, 0);
    const totalTargetRows = progress
      .filter(p => p.targetCount >= 0)
      .reduce((sum, p) => sum + p.targetCount, 0);

    console.log('\n📈 Summary:');
    console.log(`   Total tables checked: ${progress.length}`);
    console.log(`   ✅ Complete: ${complete}`);
    console.log(`   ⚠️  Partial: ${partial}`);
    console.log(`   ❌ Missing: ${missing}`);
    console.log(`   ⏭️  Not in target: ${notInTarget}`);
    console.log(`   🔴 Errors: ${errors}`);

    if (totalSourceRows > 0) {
      const overallPercentage = Math.round((totalTargetRows / totalSourceRows) * 100);
      console.log(`\n   Total source rows: ${totalSourceRows.toLocaleString()}`);
      console.log(`   Total target rows: ${totalTargetRows.toLocaleString()}`);
      console.log(`   Overall progress: ${overallPercentage}%`);
    }

    // Check for image upload status files
    console.log('\n' + '='.repeat(80));
    console.log('📸 Image Upload Status:\n');

    const failuresFile = path.join(process.cwd(), 'scripts', 'upload-failures.jsonl');
    const missingFile = path.join(process.cwd(), 'scripts', 'upload-missing.txt');

    if (fs.existsSync(failuresFile)) {
      const failuresContent = await fs.promises.readFile(failuresFile, 'utf8');
      const failureLines = failuresContent.split('\n').filter(Boolean);
      console.log(`   Upload failures logged: ${failureLines.length.toLocaleString()}`);
      if (failureLines.length > 0) {
        console.log(`   📄 See: ${failuresFile}`);
      }
    } else {
      console.log('   ✅ No upload failures file found (good!)');
    }

    if (fs.existsSync(missingFile)) {
      const missingContent = await fs.promises.readFile(missingFile, 'utf8');
      const missingLines = missingContent.split('\n').filter(Boolean);
      console.log(`   Missing local files: ${missingLines.length.toLocaleString()}`);
      if (missingLines.length > 0) {
        console.log(`   📄 See: ${missingFile}`);
        console.log(`   ⚠️  Note: These files are referenced in DB but missing locally`);
      }
    } else {
      console.log('   ✅ No missing files list found');
    }

    // Overall status
    console.log('\n' + '='.repeat(80));
    if (complete === progress.length && errors === 0) {
      console.log('✅ Synchronization: COMPLETE');
    } else if (partial > 0 || missing > 0) {
      console.log('⚠️  Synchronization: IN PROGRESS');
      console.log(`   ${complete}/${progress.length} tables complete`);
    } else if (errors > 0) {
      console.log('🔴 Synchronization: ERRORS DETECTED');
    } else {
      console.log('⏳ Synchronization: NOT STARTED');
    }
    console.log('='.repeat(80) + '\n');

  } catch (e: any) {
    console.error('\n❌ Error:', e.message);
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

