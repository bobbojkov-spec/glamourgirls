import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '@/lib/db';

function toDbPath(localPath: string): string {
  // Expect absolute paths like /.../public/securepic/206/11221.jpg
  // Convert to DB paths like /securepic/206/11221.jpg
  const normalized = localPath.trim();
  const idx = normalized.indexOf(`${path.sep}public${path.sep}`);
  if (idx === -1) return normalized;
  const rel = normalized.slice(idx + `${path.sep}public`.length);
  return rel.startsWith(path.sep) ? rel.replaceAll(path.sep, '/') : `/${rel.replaceAll(path.sep, '/')}`;
}

async function main() {
  const missingFile = path.join(process.cwd(), 'scripts', 'upload-missing.txt');
  const raw = await fs.readFile(missingFile, 'utf8');
  const absPaths = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const dbPaths = absPaths.map(toDbPath);

  const inList = dbPaths.map((p) => `'${p.replace(/'/g, "''")}'`).join(', ');

  const sql = `
    SELECT i.id, i.girlid, i.mytp, i.path
    FROM images i
    WHERE i.path IN (${inList})
    ORDER BY i.girlid, i.id
  `;

  const [rows] = await pool.execute(sql);
  console.log('Missing file count:', dbPaths.length);
  console.log('DB rows that reference these paths:', rows.length);
  console.table(rows);

  const sql2 = `
    SELECT i.girlid, COUNT(*)::int as cnt
    FROM images i
    WHERE i.path IN (${inList})
    GROUP BY i.girlid
    ORDER BY cnt DESC, i.girlid
  `;
  const [byGirl] = await pool.execute(sql2);
  console.log('Affected girls:', byGirl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


