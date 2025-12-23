/**
 * Upload actress images referenced by the DB (`images.path`) to Supabase Storage.
 *
 * Default behavior:
 * - Reads distinct non-empty `images.path` values from the SOURCE DB
 * - Maps `/securepic/1/3.jpg` -> local file `public/securepic/1/3.jpg`
 * - Uploads:
 *   - `mytp != 5` (thumbs/gallery/etc) -> public bucket `glamourgirls_images` with key `securepic/1/3.jpg`
 *   - `mytp = 5` (HQ / paid) -> private bucket `images_raw` with key `hq/securepic/1/3.jpg`
 * - Skips objects that already exist (treats 409 Conflict as "already there")
 *
 * Requirements (env):
 * - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL): e.g. https://xxxx.supabase.co
 * - SUPABASE_SERVICE_ROLE_KEY: service role key (needed for bulk uploads)
 *
 * Optional env:
 * - DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME (source db; defaults to local glamourgirls)
 *
 * Usage:
 *   npx tsx scripts/upload-images-to-supabase-storage.ts
 *
 * Flags:
 *   --bucket=glamourgirls_images
 *   --raw-bucket=images_raw
 *   --split-hq-to-raw=1                 (default: 1) send mytp=5 to raw bucket under hq/
 *   --upload-public=1                   (default: 1)
 *   --upload-raw=1                      (default: 1 if split-hq-to-raw=1)
 *   --concurrency=5
 *   --limit=100
 *   --dry-run=1
 *   --retry-failed=1                    (re-run only items from last failures file)
 *   --delete-missing-db=1               (DANGEROUS) delete DB rows from source `images` table when local file is missing
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
    if (override || process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile(path.join(process.cwd(), '.env'), false);
loadEnvFile(path.join(process.cwd(), '.env.local'), true);

type Cli = {
  bucket: string;
  rawBucket: string;
  splitHqToRaw: boolean;
  uploadPublic: boolean;
  uploadRaw: boolean;
  concurrency: number;
  limit: number | null;
  dryRun: boolean;
  retryFailed: boolean;
  deleteMissingDb: boolean;
};

function parseCli(argv: string[]): Cli {
  const get = (name: string) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const bucket = get('bucket') || 'glamourgirls_images';
  const rawBucket = get('raw-bucket') || 'images_raw';
  const splitHqToRaw = !['0', 'false', 'no'].includes((get('split-hq-to-raw') || '1').toLowerCase());
  const uploadPublic = !['0', 'false', 'no'].includes((get('upload-public') || '1').toLowerCase());
  const uploadRawDefault = splitHqToRaw ? '1' : '0';
  const uploadRaw = !['0', 'false', 'no'].includes((get('upload-raw') || uploadRawDefault).toLowerCase());
  const concurrency = Math.max(1, Math.min(25, Number(get('concurrency') || 5)));
  const limitRaw = get('limit');
  const limit = limitRaw ? Number(limitRaw) : null;
  const dryRun = ['1', 'true', 'yes'].includes((get('dry-run') || '').toLowerCase());
  const retryFailed = ['1', 'true', 'yes'].includes((get('retry-failed') || '').toLowerCase());
  const deleteMissingDb = ['1', 'true', 'yes'].includes((get('delete-missing-db') || '').toLowerCase());
  return { bucket, rawBucket, splitHqToRaw, uploadPublic, uploadRaw, concurrency, limit, dryRun, retryFailed, deleteMissingDb };
}

function mimeTypeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.bmp':
      return 'image/bmp';
    case '.tiff':
    case '.tif':
      return 'image/tiff';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) throw new Error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL');
  return url.replace(/\/$/, '');
}

function getServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (required for bulk uploads)');
  return key;
}

function storageUploadUrl(baseUrl: string, bucket: string, objectKey: string): string {
  // POST /storage/v1/object/<bucket>/<path>
  // objectKey must be URL-encoded per path segment; simplest is encodeURI for whole key
  return `${baseUrl}/storage/v1/object/${bucket}/${encodeURI(objectKey)}`;
}

function isTransientUploadError(status: number | null, message: string): boolean {
  if (status === 429) return true;
  if (status !== null && status >= 500) return true;
  if (message.includes('EHOSTUNREACH') || message.includes('ECONNRESET') || message.includes('ETIMEDOUT')) return true;
  return false;
}

function isAlreadyExistsPayload(txt: string): boolean {
  const t = (txt || '').trim();
  if (!t) return false;
  // Supabase Storage sometimes wraps duplicate responses as HTTP 400 with a JSON body containing statusCode 409.
  try {
    const j = JSON.parse(t);
    const statusCode = j?.statusCode;
    const error = String(j?.error || '');
    const message = String(j?.message || '');
    if (Number(statusCode) === 409) return true;
    if (/duplicate/i.test(error)) return true;
    if (/already exists/i.test(message)) return true;
  } catch {
    // fall through to string matching
  }
  return /"statusCode"\s*:\s*"?409"?/i.test(t) || /duplicate/i.test(t) || /already exists/i.test(t);
}

async function uploadObject(opts: {
  baseUrl: string;
  bucket: string;
  objectKey: string;
  localFile: string;
  serviceKey: string;
  dryRun: boolean;
}): Promise<'uploaded' | 'skipped_exists'> {
  if (opts.dryRun) return 'uploaded';

  const body = await fs.promises.readFile(opts.localFile);
  const url = storageUploadUrl(opts.baseUrl, opts.bucket, opts.objectKey);

  const tries = 5;
  for (let attempt = 1; attempt <= tries; attempt++) {
    let res: Response | null = null;
    let txt = '';
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${opts.serviceKey}`,
          apikey: opts.serviceKey,
          'content-type': mimeTypeForFile(opts.localFile),
          'x-upsert': 'false',
        },
        body,
      });

      if (res.status === 409) return 'skipped_exists';
      if (res.ok) return 'uploaded';

      txt = await res.text().catch(() => '');
      // Some Supabase storage deployments return HTTP 400 with a JSON payload indicating 409 Duplicate.
      if (res.status === 400 && isAlreadyExistsPayload(txt)) return 'skipped_exists';
      const msg = `Upload failed (${res.status}) ${opts.bucket}/${opts.objectKey} :: ${txt.slice(0, 200)}`;
      if (attempt < tries && isTransientUploadError(res.status, msg)) {
        const delay = 500 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw new Error(msg);
    } catch (e: any) {
      const msg = String(e?.message || e);
      const status = res?.status ?? null;
      if (attempt < tries && isTransientUploadError(status, msg)) {
        const delay = 500 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }

  return 'uploaded';
}

async function main() {
  const cli = parseCli(process.argv.slice(2));
  const baseUrl = getSupabaseUrl();
  const serviceKey = getServiceKey();

  // Source DB connection (local)
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT || '5432');
  const dbUser = process.env.DB_USER || process.env.USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'glamourgirls';

  const srcDb = new Pool({ host: dbHost, port: dbPort, user: dbUser, password: dbPassword, database: dbName });

  console.log('Supabase Storage:', baseUrl);
  console.log(
    'Buckets:',
    `public=${cli.bucket} (upload=${cli.uploadPublic})`,
    `raw=${cli.rawBucket} (upload=${cli.uploadRaw}, hqPrefix=${cli.splitHqToRaw ? 'hq/' : '(off)'})`
  );
  console.log('Concurrency:', cli.concurrency, 'Limit:', cli.limit ?? '(none)', 'Dry-run:', cli.dryRun);
  console.log('Retry failed only:', cli.retryFailed);
  console.log('Delete missing DB rows:', cli.deleteMissingDb ? 'YES (dangerous)' : 'no');

  const failuresFile = path.join(process.cwd(), 'scripts', 'upload-failures.jsonl');
  const missingFile = path.join(process.cwd(), 'scripts', 'upload-missing.txt');

  let rows: Array<{ path: string; mytp: number }> = [];
  if (cli.retryFailed && fs.existsSync(failuresFile)) {
    const lines = (await fs.promises.readFile(failuresFile, 'utf8')).split(/\r?\n/).filter(Boolean);
    const parsed = lines
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as any[];
    rows = parsed.map((r) => ({ path: String(r.path), mytp: Number(r.mytp) || 0 }));
    console.log(`Loaded ${rows.length.toLocaleString()} failed items from ${failuresFile}`);
  } else {
    // Pull paths from DB with mytp classification.
    // We group by path and take max(mytp) defensively.
    const rowsRes = await srcDb.query(
      `select path, max(mytp)::int as mytp
       from images
       where path is not null and path <> ''
       group by path
       order by path asc`
    );
    rows = rowsRes.rows.map((r: any) => ({
      path: String(r.path),
      mytp: Number(r.mytp) || 0,
    }));
  }

  if (cli.limit !== null) rows = rows.slice(0, cli.limit);

  console.log(`Found ${rows.length.toLocaleString()} distinct image paths to process.`);

  // Build work items:
  // - public key: path without leading slash
  // - raw key:    hq/<publicKey> (only for mytp=5)
  const work = rows
    .filter((r) => r.path.startsWith('/securepic/') || r.path.startsWith('/newpic/'))
    .map((r) => {
      const publicKey = r.path.replace(/^\//, '');
      const localFile = path.join(process.cwd(), 'public', publicKey);
      const isHq = r.mytp === 5;
      const rawKey = `hq/${publicKey}`;
      return { path: r.path, mytp: r.mytp, isHq, publicKey, rawKey, localFile };
    });

  console.log(`Will attempt to upload ${work.length.toLocaleString()} files from /public.`);

  let uploaded = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;
  let failuresLogged = 0;
  const missingList: string[] = [];

  if (!cli.dryRun && !cli.retryFailed) {
    // Fresh run: reset prior failure logs
    await fs.promises.writeFile(failuresFile, '');
    await fs.promises.writeFile(missingFile, '');
  }

  // Simple worker pool
  let idx = 0;
  const startedAt = Date.now();

  const workers = Array.from({ length: cli.concurrency }).map(async () => {
    while (true) {
      const i = idx++;
      if (i >= work.length) return;
      const item = work[i];

      if (!fs.existsSync(item.localFile)) {
        missing++;
        missingList.push(item.localFile);

        // Optional: delete broken DB rows referencing this missing file.
        // This is helpful when `images.path` points to files that are no longer available locally.
        if (cli.deleteMissingDb && !cli.dryRun) {
          try {
            const delRes = await srcDb.query('DELETE FROM images WHERE path = $1', [item.path]);
            if (delRes.rowCount && delRes.rowCount > 0) {
              // eslint-disable-next-line no-console
              console.log(`\n🗑️  Deleted ${delRes.rowCount} DB row(s) for missing path: ${item.path}`);
            }
          } catch (e: any) {
            // eslint-disable-next-line no-console
            console.warn(`\n⚠️  Failed deleting DB row(s) for missing path ${item.path}: ${String(e?.message || e)}`);
          }
        }
        continue;
      }

      try {
        // HQ goes to raw bucket (private), everything else goes to public bucket.
        if (item.isHq && cli.splitHqToRaw) {
          if (cli.uploadRaw) {
            const r = await uploadObject({
              baseUrl,
              bucket: cli.rawBucket,
              objectKey: item.rawKey,
              localFile: item.localFile,
              serviceKey,
              dryRun: cli.dryRun,
            });
            if (r === 'skipped_exists') skipped++;
            else uploaded++;
          }
        } else {
          if (cli.uploadPublic) {
            const r = await uploadObject({
              baseUrl,
              bucket: cli.bucket,
              objectKey: item.publicKey,
              localFile: item.localFile,
              serviceKey,
              dryRun: cli.dryRun,
            });
            if (r === 'skipped_exists') skipped++;
            else uploaded++;
          }
        }
      } catch (e) {
        failed++;
        const errMsg = String((e as any)?.message || e);
        if (!cli.dryRun) {
          const rec = {
            when: new Date().toISOString(),
            bucket: item.isHq && cli.splitHqToRaw ? cli.rawBucket : cli.bucket,
            key: item.isHq && cli.splitHqToRaw ? item.rawKey : item.publicKey,
            path: item.path,
            mytp: item.mytp,
            localFile: item.localFile,
            error: errMsg,
          };
          await fs.promises.appendFile(failuresFile, JSON.stringify(rec) + '\n');
          failuresLogged++;
          if (failuresLogged <= 5) {
            console.warn('\nFirst upload error:', rec);
          }
        }
      }

      const done = uploaded + skipped + missing + failed;
      if (done % 250 === 0 || done === work.length) {
        const elapsedS = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const rate = Math.round(done / elapsedS);
        process.stdout.write(
          `Progress: ${done}/${work.length} | uploaded=${uploaded} skipped=${skipped} missing=${missing} failed=${failed} | ${rate}/s\r`
        );
      }
    }
  });

  await Promise.all(workers);
  console.log('\nDone.');
  console.log({ uploaded, skipped, missing, failed });
  if (missingList.length > 0) {
    await fs.promises.writeFile(missingFile, missingList.join('\n') + '\n');
    console.log(`Missing file list written to: ${missingFile}`);
  }
  if (!cli.dryRun) {
    console.log(`Failure log written to: ${failuresFile}`);
  }

  await srcDb.end();
}

main().catch((e) => {
  console.error('\n❌ Upload script failed:', e.message);
  process.exit(1);
});


