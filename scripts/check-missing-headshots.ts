/**
 * Script to check specific actresses for missing headshots
 * 
 * Usage: tsx scripts/check-missing-headshots.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const ACTRESS_IDS = [564, 528, 649, 558]; // Gwili Andre, Claudia Dell, Betty Furness, Claire Maynard

async function checkActressImages(actressId: number) {
  // Get actress name
  const [actressResults] = await pool.execute(
    `SELECT id, nm as name, firstname, familiq 
     FROM girls 
     WHERE id = ?`,
    [actressId]
  ) as any[];

  const actress = Array.isArray(actressResults) && actressResults.length > 0 
    ? actressResults[0] 
    : null;

  if (!actress) {
    return {
      id: actressId,
      name: `[ID ${actressId} - NOT FOUND]`,
      found: false,
    };
  }

  const name = actress.name || `${actress.firstname || ''} ${actress.familiq || ''}`.trim();

  // Check for explicit headshot (mytp = 3 or path contains 'headshot')
  const [headshotResults] = await pool.execute(
    `SELECT id, path, width, height, mytp 
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
     ORDER BY 
       CASE 
         WHEN path ILIKE '%headshot.jpg%' THEN 1
         WHEN path ILIKE '%headshot.jpeg%' THEN 2
         WHEN path ILIKE '%headshot.png%' THEN 3
         ELSE 4
       END,
       id ASC`,
    [actressId]
  ) as any[];

  const headshots = Array.isArray(headshotResults) ? headshotResults : [];

  // Check for portrait gallery images (mytp = 4, height > width) as fallback
  const [portraitResults] = await pool.execute(
    `SELECT id, path, width, height, mytp 
     FROM images 
     WHERE girlid = ? 
       AND mytp = 4
       AND path IS NOT NULL 
       AND path != ''
       AND width > 0 
       AND height > 0
       AND height > width
     ORDER BY id ASC
     LIMIT 5`,
    [actressId]
  ) as any[];

  const portraits = Array.isArray(portraitResults) ? portraitResults : [];

  // Check for ALL gallery images (mytp = 4) regardless of orientation
  const [allGalleryResults] = await pool.execute(
    `SELECT id, path, width, height, mytp 
     FROM images 
     WHERE girlid = ? 
       AND mytp = 4
       AND path IS NOT NULL 
       AND path != ''
       AND width > 0 
       AND height > 0
     ORDER BY id ASC
     LIMIT 10`,
    [actressId]
  ) as any[];

  const allGallery = Array.isArray(allGalleryResults) ? allGalleryResults : [];

  // Check for ALL images
  const [allImagesResults] = await pool.execute(
    `SELECT id, path, width, height, mytp 
     FROM images 
     WHERE girlid = ? 
     ORDER BY id ASC`,
    [actressId]
  ) as any[];

  const allImages = Array.isArray(allImagesResults) ? allImagesResults : [];

  return {
    id: actressId,
    name,
    found: true,
    headshots,
    portraits,
    allGallery,
    allImages,
    hasHeadshot: headshots.length > 0,
    hasPortraitFallback: portraits.length > 0,
  };
}

async function main() {
  console.log('Checking actresses for missing headshots...\n');

  try {
    for (const actressId of ACTRESS_IDS) {
      const info = await checkActressImages(actressId);
      
      console.log('='.repeat(80));
      console.log(`[${info.id}] ${info.name}`);
      console.log('='.repeat(80));
      
      if (!info.found) {
        console.log('❌ ACTRESS NOT FOUND IN DATABASE\n');
        continue;
      }

      console.log(`\n✅ Has explicit headshot (mytp=3 or path contains 'headshot'): ${info.hasHeadshot ? 'YES' : 'NO'}`);
      if (info.headshots.length > 0) {
        console.log(`   Headshots found (${info.headshots.length}):`);
        info.headshots.forEach((img: any) => {
          console.log(`     - ID: ${img.id}, Path: ${img.path}, Type: ${img.mytp}, Size: ${img.width}x${img.height}`);
        });
      }

      console.log(`\n⚠️  Has portrait gallery fallback (mytp=4, height>width): ${info.hasPortraitFallback ? 'YES' : 'NO'}`);
      if (info.portraits.length > 0) {
        console.log(`   Portrait gallery images (${info.portraits.length}):`);
        info.portraits.slice(0, 3).forEach((img: any) => {
          console.log(`     - ID: ${img.id}, Path: ${img.path}, Size: ${img.width}x${img.height}`);
        });
        if (info.portraits.length > 3) {
          console.log(`     ... and ${info.portraits.length - 3} more`);
        }
      }

      console.log(`\n📊 All gallery images (mytp=4): ${info.allGallery.length}`);
      if (info.allGallery.length > 0 && info.allGallery.length <= 5) {
        info.allGallery.forEach((img: any) => {
          const orientation = img.height > img.width ? 'PORTRAIT' : img.width > img.height ? 'LANDSCAPE' : 'SQUARE';
          console.log(`     - ID: ${img.id}, Path: ${img.path}, Size: ${img.width}x${img.height} (${orientation})`);
        });
      } else if (info.allGallery.length > 5) {
        info.allGallery.slice(0, 3).forEach((img: any) => {
          const orientation = img.height > img.width ? 'PORTRAIT' : img.width > img.height ? 'LANDSCAPE' : 'SQUARE';
          console.log(`     - ID: ${img.id}, Path: ${img.path}, Size: ${img.width}x${img.height} (${orientation})`);
        });
        console.log(`     ... and ${info.allGallery.length - 3} more`);
      }

      console.log(`\n📁 Total images in database: ${info.allImages.length}`);
      if (info.allImages.length === 0) {
        console.log('   ⚠️  NO IMAGES FOUND AT ALL!');
      } else {
        // Count by type and show details
        const byType: Record<number, number> = {};
        info.allImages.forEach((img: any) => {
          byType[img.mytp] = (byType[img.mytp] || 0) + 1;
        });
        console.log(`   Images by type: ${JSON.stringify(byType)}`);
        console.log(`   All image details:`);
        info.allImages.forEach((img: any) => {
          console.log(`     - ID: ${img.id}, Type: ${img.mytp}, Path: ${img.path || 'NULL'}, Size: ${img.width || 0}x${img.height || 0}`);
        });
      }

      console.log(`\n❌ Will show in listings: ${info.hasHeadshot || info.hasPortraitFallback ? 'YES' : 'NO'}`);
      
      console.log('');
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

