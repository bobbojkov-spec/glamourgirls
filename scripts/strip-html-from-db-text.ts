/**
 * One-time cleanup script:
 * - Finds HTML-like markup in DB text fields and normalizes it to a safe allowlist HTML
 *   (<b>, <i>, <br>) so admin can render it as rich text without raw tags/attributes.
 *
 * Targets:
 * - girlinfos.shrttext (date)
 * - girlinfos.lngtext  (event)
 * - girls.sources
 * - girls SEO-ish fields: seoTitle, metaDescription, metaKeywords, ogTitle, ogDescription, h1Title
 *
 * Usage:
 *   npx tsx scripts/strip-html-from-db-text.ts --dry-run=1
 *   npx tsx scripts/strip-html-from-db-text.ts --apply=1
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { hasHtmlLikeMarkup } from '@/lib/sanitizePlainText';
import { sanitizeLimitedHtml } from '@/lib/sanitizeLimitedHtml';

function loadEnvFile(filePath: string, override: boolean) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const normalized = raw.replace(/^\s*export\s+/gm, '');
  const parsed = dotenv.parse(normalized);
  for (const [k, v] of Object.entries(parsed)) {
    if (override || process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile(path.join(process.cwd(), '.env'), false);
loadEnvFile(path.join(process.cwd(), '.env.local'), true);

function parseCli(argv: string[]) {
  const get = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const apply = ['1', 'true', 'yes'].includes((get('apply') || '').toLowerCase());
  const dryRun = !apply || ['1', 'true', 'yes'].includes((get('dry-run') || '').toLowerCase());
  return { apply, dryRun };
}

function getDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    return {
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
    };
  }
  // Fallback to local pg envs
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || process.env.USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'glamourgirls',
  } as any;
}

async function main() {
  const cli = parseCli(process.argv.slice(2));
  const db = new Pool(getDbConfig());

  console.log('Mode:', cli.dryRun ? 'DRY-RUN' : 'APPLY');

  // 1) girlinfos
  const giRes = await db.query(
    `select girlid::int as girlid, ord::int as ord, shrttext, lngtext
     from girlinfos
     where (shrttext like '%<%' and shrttext like '%>%')
        or (lngtext like '%<%' and lngtext like '%>%')
     order by girlid, ord`
  );

  let giChanged = 0;
  for (const r of giRes.rows) {
    const sh = String(r.shrttext ?? '');
    const ln = String(r.lngtext ?? '');
    if (!hasHtmlLikeMarkup(sh) && !hasHtmlLikeMarkup(ln)) continue;
    const sh2 = sanitizeLimitedHtml(sh);
    const ln2 = sanitizeLimitedHtml(ln);
    if (sh2 === sh && ln2 === ln) continue;
    giChanged++;
    if (!cli.dryRun) {
      await db.query(
        `update girlinfos set shrttext = $1, lngtext = $2 where girlid = $3 and ord = $4`,
        [sh2, ln2, r.girlid, r.ord]
      );
    }
  }
  console.log('girlinfos rows with HTML cleaned:', giChanged);

  // 2) girls.sources + SEO fields
  const girlsRes = await db.query(
    `select id::int as id, sources, seoTitle, metaDescription, metaKeywords, ogTitle, ogDescription, h1Title
     from girls
     where (sources like '%<%' and sources like '%>%')
        or (seoTitle like '%<%' and seoTitle like '%>%')
        or (metaDescription like '%<%' and metaDescription like '%>%')
        or (metaKeywords like '%<%' and metaKeywords like '%>%')
        or (ogTitle like '%<%' and ogTitle like '%>%')
        or (ogDescription like '%<%' and ogDescription like '%>%')
        or (h1Title like '%<%' and h1Title like '%>%')
     order by id`
  );

  let girlsChanged = 0;
  for (const r of girlsRes.rows) {
    const next: any = {};
    const fields = ['sources', 'seotitle', 'metadescription', 'metakeywords', 'ogtitle', 'ogdescription', 'h1title'] as const;

    // pg returns lowercase keys for quoted/unquoted? we selected camelCase, so keep both.
    const getVal = (k: string) => (r as any)[k] ?? (r as any)[k.toLowerCase()];

    for (const f of fields) {
      const v = getVal(f);
      if (!hasHtmlLikeMarkup(v)) continue;
      const cleaned = sanitizeLimitedHtml(v);
      if (cleaned !== String(v ?? '')) {
        next[f] = cleaned;
      }
    }
    if (Object.keys(next).length === 0) continue;
    girlsChanged++;

    if (!cli.dryRun) {
      await db.query(
        `update girls set
          sources = $1,
          seoTitle = $2,
          metaDescription = $3,
          metaKeywords = $4,
          ogTitle = $5,
          ogDescription = $6,
          h1Title = $7
         where id = $8`,
        [
          next.sources ?? r.sources ?? '',
          next.seotitle ?? r.seotitle ?? r.seoTitle ?? null,
          next.metadescription ?? r.metadescription ?? r.metaDescription ?? null,
          next.metakeywords ?? r.metakeywords ?? r.metaKeywords ?? null,
          next.ogtitle ?? r.ogtitle ?? r.ogTitle ?? null,
          next.ogdescription ?? r.ogdescription ?? r.ogDescription ?? null,
          next.h1title ?? r.h1title ?? r.h1Title ?? null,
          r.id,
        ]
      );
    }
  }
  console.log('girls rows with HTML cleaned:', girlsChanged);

  await db.end();

  if (cli.dryRun) {
    console.log('Dry-run complete. Re-run with --apply=1 to write changes.');
  } else {
    console.log('Apply complete.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


