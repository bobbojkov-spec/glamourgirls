import pool from '@/lib/db';
import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const OLD_DIRECTORIES = [
  '/Users/borislavbojkov/dev/gg_old_securepic',
  '/Users/borislavbojkov/dev/gg_old_newpic',
];

const PLACEHOLDER_PATH = '/hasnoheadshot.jpg';

async function checkHasSecondGif(actressId: number): Promise<boolean> {
  for (const baseDir of OLD_DIRECTORIES) {
    const folder = path.join(baseDir, actressId.toString());
    try {
      await fs.access(folder);
      const files = await fs.readdir(folder);
      const gifFiles = files
        .filter(f => f.toLowerCase().endsWith('.gif'))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.replace(/\D/g, '')) || 0;
          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
        });
      return gifFiles.length >= 2;
    } catch {
      continue;
    }
  }
  return false;
}

async function main() {
  const [theirMenResults] = await pool.execute(
    `SELECT g.id, g.nm, g.firstname, g.familiq
     FROM girls g
     WHERE g.published = 2
       AND g.theirman = true
     ORDER BY g.id ASC`
  ) as any[];

  const theirMenEntries = Array.isArray(theirMenResults) ? theirMenResults : [];
  
  console.log(`Checking ${theirMenEntries.length} "Their Men" entries...\n`);

  const needsUpdate: Array<{ id: number; name: string }> = [];
  const correct: Array<{ id: number; name: string; path: string }> = [];

  for (const entry of theirMenEntries) {
    const actressId = Number(entry.id);
    const name = entry.nm || `${entry.firstname || ''} ${entry.familiq || ''}`.trim();
    
    const hasSecondGif = await checkHasSecondGif(actressId);
    
    // Get current headshot path
    const [headshotResults] = await pool.execute(
      `SELECT path FROM images 
       WHERE girlid = ? 
         AND (path ILIKE '%headshot%' OR mytp = 3)
       LIMIT 1`,
      [actressId]
    ) as any[];

    const currentPath = headshotResults && headshotResults.length > 0 ? headshotResults[0].path : null;

    if (!hasSecondGif) {
      // Should use placeholder
      if (currentPath !== PLACEHOLDER_PATH) {
        needsUpdate.push({ id: actressId, name });
        console.log(`⚠️  [${actressId}] ${name}: Should use placeholder, currently: ${currentPath || 'NO PATH'}`);
      } else {
        correct.push({ id: actressId, name, path: currentPath });
        console.log(`✓ [${actressId}] ${name}: Correctly using placeholder`);
      }
    } else {
      // Should use real headshot
      if (currentPath === PLACEHOLDER_PATH) {
        console.log(`⚠️  [${actressId}] ${name}: Has 2 GIFs but using placeholder - should have real headshot`);
      } else {
        correct.push({ id: actressId, name, path: currentPath || 'NO PATH' });
        console.log(`✓ [${actressId}] ${name}: Has real headshot: ${currentPath || 'NO PATH'}`);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Correct: ${correct.length}`);
  console.log(`  Need update: ${needsUpdate.length}`);

  if (needsUpdate.length > 0) {
    console.log(`\n🔄 Updating ${needsUpdate.length} entries to use placeholder...\n`);
    
    for (const { id: actressId, name } of needsUpdate) {
      try {
        await pool.execute(
          `DELETE FROM images WHERE girlid = ? AND (path ILIKE '%headshot%' OR mytp = 3)`,
          [actressId]
        );

        await pool.execute(
          `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
           VALUES (?, ?, 190, 245, 3, 'image/jpeg', 2000)`,
          [actressId, PLACEHOLDER_PATH]
        );

        console.log(`✓ [${actressId}] ${name}: Updated to ${PLACEHOLDER_PATH}`);
      } catch (error: any) {
        console.error(`✗ [${actressId}] ${name}: Error - ${error.message}`);
      }
    }

    console.log(`\n✅ All entries updated!`);
  } else {
    console.log(`\n✅ All entries are correctly linked!`);
  }

  await pool.end();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

