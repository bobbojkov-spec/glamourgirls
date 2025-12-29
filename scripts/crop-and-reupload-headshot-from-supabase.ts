/**
 * Crop + reupload an existing headshot from Supabase Storage.
 *
 * What it does:
 * - Detects whether the actress lives in `securepic/<id>` or `newpic/<id>`
 * - Downloads `<folder>/<id>/headshot.jpg` from Supabase
 * - Re-processes it to the canonical headshot size: 190×245 (resize-to-height, then center-crop width)
 * - Uploads it back (upsert) to the same storage path
 * - Upserts the corresponding `images` row so `/api/actresses/:id/headshot` can find it
 *
 * Usage:
 *   tsx scripts/crop-and-reupload-headshot-from-supabase.ts 160
 *   tsx scripts/crop-and-reupload-headshot-from-supabase.ts 160 --folder securepic
 *   tsx scripts/crop-and-reupload-headshot-from-supabase.ts 160 --legacy-edge-crop
 *   tsx scripts/crop-and-reupload-headshot-from-supabase.ts 160 --dry-run
 */

import dotenv from 'dotenv';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import pool from '@/lib/db';
import { uploadToStorage } from '@/lib/supabase/storage';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const BUCKET = 'glamourgirls_images';
const TARGET_WIDTH = 190;
const TARGET_HEIGHT = 245;

function parseArgs(argv: string[]) {
  const args = {
    actressId: Number.NaN,
    folder: undefined as 'securepic' | 'newpic' | undefined,
    dryRun: false,
    legacyEdgeCrop: false,
  };

  const positional = argv.filter((a) => !a.startsWith('--'));
  args.actressId = parseInt(positional[2] || '', 10);

  for (const a of argv.slice(3)) {
    if (a === '--dry-run') args.dryRun = true;
    if (a === '--legacy-edge-crop') args.legacyEdgeCrop = true;
    if (a.startsWith('--folder=')) {
      const v = a.split('=')[1];
      if (v === 'securepic' || v === 'newpic') args.folder = v;
    }
  }

  return args;
}

async function detectFolderFromDb(actressId: number): Promise<'securepic' | 'newpic' | null> {
  const [rows] = await pool.execute(
    `SELECT path
     FROM images
     WHERE girlid = ?
       AND path IS NOT NULL
       AND path != ''
       AND (
         path ILIKE '%/headshot.jpg'
         OR path ILIKE '%/headshot.jpeg'
         OR path ILIKE '%/headshot.png'
       )
     ORDER BY id ASC
     LIMIT 1`,
    [actressId]
  ) as any[];

  const dbPath = Array.isArray(rows) && rows.length > 0 ? String(rows[0].path || '') : '';
  const m = dbPath.match(/^\/?(securepic|newpic)\//i);
  if (!m) return null;
  return m[1].toLowerCase() as 'securepic' | 'newpic';
}

async function detectFolderFromStorage(actressId: number, supabase: any): Promise<'securepic' | 'newpic'> {
  try {
    const { data } = await supabase.storage.from(BUCKET).list(`securepic/${actressId}`, { limit: 1 });
    if (data && data.length > 0) return 'securepic';
  } catch {
    // ignore
  }
  return 'newpic';
}

async function downloadHeadshot(supabase: any, folder: 'securepic' | 'newpic', actressId: number) {
  const storagePath = `${folder}/${actressId}/headshot.jpg`;
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(`Failed to download ${storagePath}: ${error?.message || 'no data returned'}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return { storagePath, buffer: Buffer.from(arrayBuffer) };
}

async function processToCanonicalHeadshot(buffer: Buffer, opts?: { legacyEdgeCrop?: boolean }) {
  const legacyEdgeCrop = Boolean(opts?.legacyEdgeCrop);
  let image = sharp(buffer);
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error('Invalid image dimensions (cannot read metadata)');
  }

  // Optional legacy crop used for some GIF-derived headshots:
  // Crop: left 25px, top 30px, right 30px, bottom 25px
  if (legacyEdgeCrop) {
    const cropLeft = 25;
    const cropTop = 30;
    const cropRight = 30;
    const cropBottom = 25;

    const cropWidth = meta.width - cropLeft - cropRight;
    const cropHeight = meta.height - cropTop - cropBottom;

    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error(`Invalid legacy edge crop for ${meta.width}x${meta.height} (result ${cropWidth}x${cropHeight})`);
    }

    image = image.extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    });
  }

  // Step 1: resize to target height (allow enlarging)
  let processed = image.resize(null, TARGET_HEIGHT, {
    fit: 'inside',
    withoutEnlargement: false,
  });

  // Step 2: inspect resized width
  const resizedBuffer = await processed.toBuffer();
  const resizedMeta = await sharp(resizedBuffer).metadata();
  const resizedWidth = resizedMeta.width || TARGET_WIDTH;

  // Step 3: crop width centered (or cover-resize if smaller)
  if (resizedWidth > TARGET_WIDTH) {
    const cropLeft = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
    processed = sharp(resizedBuffer).extract({
      left: cropLeft,
      top: 0,
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
    });
  } else if (resizedWidth < TARGET_WIDTH) {
    processed = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'cover' });
  }

  const out = await processed.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const outMeta = await sharp(out).metadata();
  return {
    original: { width: meta.width, height: meta.height },
    final: { width: outMeta.width || TARGET_WIDTH, height: outMeta.height || TARGET_HEIGHT },
    buffer: out,
  };
}

async function upsertImagesRow(actressId: number, dbPath: string, width: number, height: number, byteSize: number) {
  const [existingRows] = await pool.execute(
    `SELECT id FROM images
     WHERE girlid = ?
       AND path IS NOT NULL
       AND path != ''
       AND (path ILIKE '%headshot.jpg' OR path ILIKE '%headshot.jpeg' OR path ILIKE '%headshot.png')
     ORDER BY id ASC
     LIMIT 1`,
    [actressId]
  ) as any[];

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    const existingId = Number(existingRows[0].id);
    await pool.execute(
      `UPDATE images
       SET path = ?, width = ?, height = ?, mytp = 3, mimetype = ?, sz = ?
       WHERE id = ?`,
      [dbPath, width, height, 'image/jpeg', String(byteSize), existingId]
    );
  } else {
    await pool.execute(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz)
       VALUES (?, ?, ?, ?, 3, ?, ?)`,
      [actressId, dbPath, width, height, 'image/jpeg', String(byteSize)]
    );
  }
}

async function main() {
  const { actressId, folder: folderArg, dryRun, legacyEdgeCrop } = parseArgs(process.argv);

  if (!actressId || Number.isNaN(actressId)) {
    console.error(
      'Usage: tsx scripts/crop-and-reupload-headshot-from-supabase.ts <actressId> [--folder=securepic|newpic] [--legacy-edge-crop] [--dry-run]'
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Decide folder
  let folder: 'securepic' | 'newpic' = folderArg || (await detectFolderFromDb(actressId)) || (await detectFolderFromStorage(actressId, supabase));

  // Download (fallback to the other folder if missing)
  let dl: { storagePath: string; buffer: Buffer };
  try {
    dl = await downloadHeadshot(supabase, folder, actressId);
  } catch (e) {
    const other = folder === 'securepic' ? 'newpic' : 'securepic';
    console.warn(`[${actressId}] Failed to download from ${folder}, trying ${other}...`);
    folder = other;
    dl = await downloadHeadshot(supabase, folder, actressId);
  }

  const processed = await processToCanonicalHeadshot(dl.buffer, { legacyEdgeCrop });
  console.log(
    `[${actressId}] ${dl.storagePath}: ${processed.original.width}×${processed.original.height} -> ${processed.final.width}×${processed.final.height} (${processed.buffer.length} bytes)`
  );

  const dbPath = `/${folder}/${actressId}/headshot.jpg`;
  const storagePath = `${folder}/${actressId}/headshot.jpg`;

  if (dryRun) {
    console.log(`[${actressId}] Dry run: would upload to ${storagePath} and upsert DB path=${dbPath}`);
    return;
  }

  const uploaded = await uploadToStorage(storagePath, processed.buffer, BUCKET, 'image/jpeg');
  if (!uploaded) {
    throw new Error(`Upload failed for ${storagePath}`);
  }

  await upsertImagesRow(actressId, dbPath, processed.final.width, processed.final.height, processed.buffer.length);

  console.log(`[${actressId}] ✓ Reuploaded + DB updated. Note: public pages may cache old headshots unless URL is cache-busted.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


