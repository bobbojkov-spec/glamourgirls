/**
 * Remove fake/wrong headshots for "their men" entries that don't have a second GIF
 * This allows the API to return the original placeholder automatically
 * 
 * Usage: tsx scripts/remove-fake-headshots.ts
 */

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
  console.log('🔍 Finding "Their Men" entries without second GIF...\n');

  const [theirMenResults] = await pool.execute(
    `SELECT g.id, g.nm, g.firstname, g.familiq
     FROM girls g
     WHERE g.published = 2
       AND g.theirman = true
     ORDER BY g.id ASC`
  ) as any[];

  const theirMenEntries = Array.isArray(theirMenResults) ? theirMenResults : [];
  
  if (theirMenEntries.length === 0) {
    console.log('No "Their Men" entries found');
    await pool.end();
    process.exit(0);
  }

  console.log(`Checking ${theirMenEntries.length} "Their Men" entries...\n`);

  const toRemove: Array<{ id: number; name: string; currentPath: string }> = [];

  for (const entry of theirMenEntries) {
    const actressId = Number(entry.id);
    const name = entry.nm || `${entry.firstname || ''} ${entry.familiq || ''}`.trim();
    
    const hasSecondGif = await checkHasSecondGif(actressId);
    
    if (!hasSecondGif) {
      // Get current headshot path
      const [headshotResults] = await pool.execute(
        `SELECT path FROM images 
         WHERE girlid = ? 
           AND (path ILIKE '%headshot%' OR mytp = 3)
         LIMIT 1`,
        [actressId]
      ) as any[];

      const currentPath = headshotResults && headshotResults.length > 0 ? headshotResults[0].path : null;

      if (currentPath) {
        toRemove.push({ id: actressId, name, currentPath });
        console.log(`⚠️  [${actressId}] ${name}: Has fake headshot (${currentPath}) - will remove`);
      } else {
        console.log(`✓ [${actressId}] ${name}: No headshot (will use placeholder)`);
      }
    } else {
      console.log(`✓ [${actressId}] ${name}: Has real headshot (2 GIFs found)`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Entries to clean: ${toRemove.length}`);

  if (toRemove.length === 0) {
    console.log('\n✅ No fake headshots to remove');
    await pool.end();
    process.exit(0);
  }

  console.log(`\n🗑️  Removing fake headshots from database...\n`);

  let removed = 0;
  let errors = 0;

  for (const { id: actressId, name, currentPath } of toRemove) {
    try {
      await pool.execute(
        `DELETE FROM images WHERE girlid = ? AND (path ILIKE '%headshot%' OR mytp = 3)`,
        [actressId]
      );

      console.log(`✓ [${actressId}] ${name}: Removed fake headshot (${currentPath})`);
      removed++;
    } catch (error: any) {
      console.error(`✗ [${actressId}] ${name}: Error - ${error.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`  Removed: ${removed}`);
  console.log(`  Errors: ${errors}`);
  console.log(`\n📝 Note: The API will now automatically return the placeholder for these entries`);

  await pool.end();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

