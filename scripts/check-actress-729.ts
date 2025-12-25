/**
 * Script to check actress 729 data and images
 * Usage: tsx scripts/check-actress-729.ts
 */

import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkActress729() {
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    // Get actress info
    const actressResult = await client.query(
      `SELECT id, nm, firstname, familiq, published, theirman, slug
       FROM girls 
       WHERE id = $1`,
      [729]
    );

    if (actressResult.rows.length === 0) {
      console.log('Actress 729 not found');
      return;
    }

    const actress = actressResult.rows[0];
    console.log('\n=== Actress 729 Info ===');
    console.log(`ID: ${actress.id}`);
    console.log(`Name: ${actress.nm}`);
    console.log(`First Name: ${actress.firstname || 'N/A'}`);
    console.log(`Last Name: ${actress.familiq || 'N/A'}`);
    console.log(`Published: ${actress.published}`);
    console.log(`Their Man: ${actress.theirman || 'N/A'}`);
    console.log(`Slug: ${actress.slug || 'N/A'}`);

    // Get all images
    const imagesResult = await client.query(
      `SELECT id, path, width, height, mytp, thumbid, sz, description
       FROM images 
       WHERE girlid = $1 
       ORDER BY mytp, id ASC`,
      [729]
    );

    console.log(`\n=== Images (${imagesResult.rows.length} total) ===`);
    
    const headshots = imagesResult.rows.filter((img: any) => img.path?.includes('headshot'));
    const gallery = imagesResult.rows.filter((img: any) => img.mytp === 4);
    const hq = imagesResult.rows.filter((img: any) => img.mytp === 5);
    const thumbs = imagesResult.rows.filter((img: any) => img.mytp === 3);

    if (headshots.length > 0) {
      console.log('\n--- Headshots ---');
      headshots.forEach((img: any) => {
        console.log(`  ID: ${img.id}, Path: ${img.path}`);
        console.log(`    Dimensions: ${img.width} × ${img.height}px`);
        console.log(`    Size: ${img.sz ? (img.sz / 1024).toFixed(2) + ' KB' : 'N/A'}`);
        console.log(`    Description: ${img.description || 'N/A'}`);
      });
    }

    if (gallery.length > 0) {
      console.log(`\n--- Gallery Images (${gallery.length}) ---`);
      gallery.slice(0, 5).forEach((img: any) => {
        console.log(`  ID: ${img.id}, Path: ${img.path}`);
        console.log(`    Dimensions: ${img.width} × ${img.height}px`);
        console.log(`    Description: ${img.description || 'N/A'}`);
      });
      if (gallery.length > 5) {
        console.log(`  ... and ${gallery.length - 5} more`);
      }
    }

    if (hq.length > 0) {
      console.log(`\n--- HQ Images (${hq.length}) ---`);
      hq.slice(0, 3).forEach((img: any) => {
        console.log(`  ID: ${img.id}, Path: ${img.path}`);
        console.log(`    Dimensions: ${img.width} × ${img.height}px`);
        console.log(`    Size: ${img.sz ? (img.sz / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}`);
        console.log(`    Description: ${img.description || 'N/A'}`);
      });
      if (hq.length > 3) {
        console.log(`  ... and ${hq.length - 3} more`);
      }
    }

    if (thumbs.length > 0) {
      console.log(`\n--- Thumbnails (${thumbs.length}) ---`);
      console.log(`  (First 3 shown)`);
      thumbs.slice(0, 3).forEach((img: any) => {
        console.log(`  ID: ${img.id}, Path: ${img.path}`);
        console.log(`    Dimensions: ${img.width} × ${img.height}px`);
      });
    }

    // Check headshot URL
    console.log('\n=== Headshot URL ===');
    console.log(`  /api/actresses/729/headshot`);
    if (headshots.length > 0) {
      console.log(`  Database path: ${headshots[0].path}`);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

checkActress729().catch(console.error);

