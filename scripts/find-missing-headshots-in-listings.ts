/**
 * Script to find which actresses don't have headshots/thumbnails for listings
 * 
 * This script checks the database to see which published actresses are missing headshots
 * that would be used in listings (search results, grids, etc.)
 * 
 * Usage: tsx scripts/find-missing-headshots-in-listings.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface ActressInfo {
  id: number;
  name: string;
  hasHeadshot: boolean;
  hasPortraitGallery: boolean;
  headshotPath: string | null;
}

async function checkActressHeadshot(actressId: number): Promise<ActressInfo> {
  // Check for explicit headshot (headshot.jpg, headshot.jpeg, headshot.png, or mytp = 3)
  const [headshotResults] = await pool.execute(
    `SELECT path 
     FROM images 
     WHERE girlid = ? 
       AND path IS NOT NULL 
       AND path != ''
       AND (
         path ILIKE '%headshot.jpg%' 
         OR path ILIKE '%headshot.jpeg%'
         OR path ILIKE '%headshot.png%'
         OR mytp = 3
       )
     LIMIT 1`,
    [actressId]
  ) as any[];

  const hasHeadshot = Array.isArray(headshotResults) && headshotResults.length > 0;
  const headshotPath = hasHeadshot ? headshotResults[0].path : null;

  // Check for portrait-oriented gallery image (mytp = 4, height > width) as fallback
  const [portraitResults] = await pool.execute(
    `SELECT path 
     FROM images 
     WHERE girlid = ? 
       AND mytp = 4
       AND path IS NOT NULL 
       AND path != ''
       AND width > 0 
       AND height > 0
       AND height > width
     ORDER BY id ASC
     LIMIT 1`,
    [actressId]
  ) as any[];

  const hasPortraitGallery = Array.isArray(portraitResults) && portraitResults.length > 0;

  return {
    id: actressId,
    name: '',
    hasHeadshot,
    hasPortraitGallery,
    headshotPath,
  };
}

async function main() {
  console.log('Finding published actresses without headshots for listings...\n');

  try {
    // Get all published actresses
    const [results] = await pool.execute(`
      SELECT DISTINCT g.id, g.nm as name
      FROM girls g
      WHERE g.published = 2
        AND (g.theirman IS NULL OR g.theirman = false)
      ORDER BY g.id
    `) as any[];

    const actresses = Array.isArray(results) ? results : [];
    console.log(`Checking ${actresses.length} published actresses...\n`);

    const missingHeadshots: ActressInfo[] = [];
    const hasHeadshots: ActressInfo[] = [];
    const hasOnlyPortraitFallback: ActressInfo[] = [];

    for (const actress of actresses) {
      const actressId = Number(actress.id);
      const name = String(actress.name || '');
      
      const info = await checkActressHeadshot(actressId);
      info.name = name;

      if (info.hasHeadshot) {
        hasHeadshots.push(info);
      } else if (info.hasPortraitGallery) {
        hasOnlyPortraitFallback.push(info);
      } else {
        missingHeadshots.push(info);
      }
    }

    // Print results
    console.log('='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`\n✅ Actresses WITH headshots: ${hasHeadshots.length}`);
    console.log(`⚠️  Actresses with ONLY portrait gallery fallback: ${hasOnlyPortraitFallback.length}`);
    console.log(`❌ Actresses MISSING headshots (no thumbnail): ${missingHeadshots.length}`);
    console.log(`\nTotal checked: ${actresses.length}`);

    if (missingHeadshots.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('ACTRESSES MISSING HEADSHOTS (No thumbnail in listings)');
      console.log('='.repeat(60));
      
      // Group by first letter for easier reading
      const grouped: Record<string, ActressInfo[]> = {};
      missingHeadshots.forEach(actress => {
        const firstLetter = actress.name.charAt(0).toUpperCase();
        if (!grouped[firstLetter]) {
          grouped[firstLetter] = [];
        }
        grouped[firstLetter].push(actress);
      });

      Object.keys(grouped).sort().forEach(letter => {
        console.log(`\n[${letter}]`);
        grouped[letter].forEach(actress => {
          console.log(`  [${actress.id}] ${actress.name}`);
        });
      });

      console.log('\n' + '='.repeat(60));
      console.log('SUMMARY');
      console.log('='.repeat(60));
      console.log(`\nMissing headshots: ${missingHeadshots.length} actresses`);
      console.log(`\nFirst 20 missing:`);
      missingHeadshots.slice(0, 20).forEach(actress => {
        console.log(`  [${actress.id}] ${actress.name}`);
      });
      
      if (missingHeadshots.length > 20) {
        console.log(`\n... and ${missingHeadshots.length - 20} more`);
      }
    }

    if (hasOnlyPortraitFallback.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('ACTRESSES WITH PORTRAIT GALLERY FALLBACK (but no explicit headshot)');
      console.log('='.repeat(60));
      console.log(`\nThese actresses will show a gallery image as thumbnail, but don't have a dedicated headshot:`);
      hasOnlyPortraitFallback.slice(0, 20).forEach(actress => {
        console.log(`  [${actress.id}] ${actress.name}`);
      });
      if (hasOnlyPortraitFallback.length > 20) {
        console.log(`\n... and ${hasOnlyPortraitFallback.length - 20} more`);
      }
    }

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

main();

