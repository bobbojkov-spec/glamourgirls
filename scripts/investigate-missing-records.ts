/**
 * Investigate Missing Records in Supabase Migration
 * 
 * Finds which specific images and girlinfos records are missing in Supabase
 * 
 * Usage:
 *   npx tsx scripts/investigate-missing-records.ts
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

async function main() {
  console.log('🔍 Investigating Missing Records\n');
  console.log('='.repeat(80));

  const sourceUrl = getSourceUrl();
  const targetUrl = getTargetUrl();

  const source = new Pool({ connectionString: sourceUrl, ssl: undefined });
  const target = new Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  try {
    // Check missing images
    console.log('\n📸 Missing Images (3 expected):\n');
    
    const sourceImages = await source.query(`
      SELECT id, girlid, path, mytp, imgtype, width, height
      FROM images
      ORDER BY id
    `);

    const targetImages = await target.query(`
      SELECT id, girlid, path, mytp, imgtype, width, height
      FROM images
      ORDER BY id
    `);

    const sourceImageIds = new Set(sourceImages.rows.map((r: any) => r.id));
    const targetImageIds = new Set(targetImages.rows.map((r: any) => r.id));
    
    const missingImageIds = Array.from(sourceImageIds).filter(id => !targetImageIds.has(id));
    
    if (missingImageIds.length > 0) {
      console.log(`Found ${missingImageIds.length} missing images:\n`);
      
      for (const id of missingImageIds) {
        const img = sourceImages.rows.find((r: any) => r.id === id);
        if (img) {
          console.log(`  ID: ${img.id}`);
          console.log(`  Girl ID: ${img.girlid}`);
          console.log(`  Path: ${img.path || '(null)'}`);
          console.log(`  Type: ${img.mytp}`);
          console.log(`  Image Type: ${img.imgtype}`);
          console.log(`  Dimensions: ${img.width}x${img.height}`);
          console.log('');
        }
      }
    } else {
      console.log('  ✅ No missing images found by ID comparison');
      console.log('  Checking by path comparison...\n');
      
      // Compare by path instead
      const sourcePaths = new Map(
        sourceImages.rows.map((r: any) => [r.path || `id_${r.id}`, r])
      );
      const targetPaths = new Set(
        targetImages.rows.map((r: any) => r.path || `id_${r.id}`)
      );
      
      const missingByPath: any[] = [];
      for (const [path, img] of sourcePaths.entries()) {
        if (!targetPaths.has(path)) {
          missingByPath.push(img);
        }
      }
      
      if (missingByPath.length > 0) {
        console.log(`Found ${missingByPath.length} images missing by path:\n`);
        for (const img of missingByPath.slice(0, 10)) {
          console.log(`  ID: ${img.id}, Path: ${img.path || '(null)'}, Girl ID: ${img.girlid}`);
        }
        if (missingByPath.length > 10) {
          console.log(`  ... and ${missingByPath.length - 10} more`);
        }
      }
    }

    // Check missing girlinfos
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 Missing GirlInfos (33 expected):\n');
    
    const sourceGirlInfos = await source.query(`
      SELECT id, girlid, shrttext, lngtext, ord
      FROM girlinfos
      ORDER BY id
    `);

    const targetGirlInfos = await target.query(`
      SELECT id, girlid, shrttext, lngtext, ord
      FROM girlinfos
      ORDER BY id
    `);

    const sourceGirlInfoIds = new Set(sourceGirlInfos.rows.map((r: any) => r.id));
    const targetGirlInfoIds = new Set(targetGirlInfos.rows.map((r: any) => r.id));
    
    const missingGirlInfoIds = Array.from(sourceGirlInfoIds).filter(id => !targetGirlInfoIds.has(id));
    
    if (missingGirlInfoIds.length > 0) {
      console.log(`Found ${missingGirlInfoIds.length} missing girlinfos:\n`);
      
      // Get girl names for context
      const girlIds = [...new Set(missingGirlInfoIds.map(id => {
        const info = sourceGirlInfos.rows.find((r: any) => r.id === id);
        return info?.girlid;
      }).filter(Boolean))];
      
      const girlNames = await source.query(`
        SELECT id, nm
        FROM girls
        WHERE id = ANY($1)
      `, [girlIds]);
      
      const girlMap = new Map(girlNames.rows.map((r: any) => [r.id, r.nm || `ID ${r.id}`]));
      
      for (const id of missingGirlInfoIds) {
        const info = sourceGirlInfos.rows.find((r: any) => r.id === id);
        if (info) {
          const girlName = girlMap.get(info.girlid) || `ID ${info.girlid}`;
          const infoText = info.lngtext || info.shrttext || '';
          const infoPreview = infoText.substring(0, 100).replace(/\n/g, ' ');
          console.log(`  ID: ${info.id}`);
          console.log(`  Girl: ${girlName} (ID: ${info.girlid})`);
          console.log(`  Short text: ${info.shrttext || '(empty)'}`);
          console.log(`  Info preview: ${infoPreview}${infoText.length > 100 ? '...' : ''}`);
          console.log(`  Order: ${info.ord}`);
          console.log('');
        }
      }
    } else {
      console.log('  ✅ No missing girlinfos found by ID comparison');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`   Source images: ${sourceImages.rows.length.toLocaleString()}`);
    console.log(`   Target images: ${targetImages.rows.length.toLocaleString()}`);
    console.log(`   Missing images: ${missingImageIds.length}`);
    console.log(`   Source girlinfos: ${sourceGirlInfos.rows.length.toLocaleString()}`);
    console.log(`   Target girlinfos: ${targetGirlInfos.rows.length.toLocaleString()}`);
    console.log(`   Missing girlinfos: ${missingGirlInfoIds.length}`);

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

