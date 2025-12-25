/**
 * Script to check actress 1 data and images
 * Usage: tsx scripts/check-actress-1.ts
 */

import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkActress1() {
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    // Get actress info
    const actressResult = await client.query(
      `SELECT id, nm, firstname, familiq, published, theirman, slug
       FROM girls 
       WHERE id = $1`,
      [1]
    );

    if (actressResult.rows.length === 0) {
      console.log('Actress 1 not found');
      return;
    }

    const actress = actressResult.rows[0];
    console.log('\n=== Actress 1 Info ===');
    console.log(`ID: ${actress.id}`);
    console.log(`Name: ${actress.nm}`);
    console.log(`First Name: ${actress.firstname || 'N/A'}`);
    console.log(`Last Name: ${actress.familiq || 'N/A'}`);
    console.log(`Published: ${actress.published}`);
    console.log(`Slug: ${actress.slug || 'N/A'}`);

    // Get all images
    const imagesResult = await client.query(
      `SELECT id, path, width, height, mytp, thumbid, sz, description
       FROM images 
       WHERE girlid = $1 
       ORDER BY mytp, id ASC`,
      [1]
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
      });
    }

    if (gallery.length > 0) {
      console.log(`\n--- Gallery Images (${gallery.length}) ---`);
      gallery.forEach((img: any) => {
        console.log(`  ID: ${img.id}, Path: ${img.path}`);
        console.log(`    Dimensions: ${img.width} × ${img.height}px`);
        console.log(`    Size: ${img.sz ? (img.sz / 1024).toFixed(2) + ' KB' : 'N/A'}`);
        console.log(`    Description: ${img.description || 'N/A'}`);
        console.log(`    ThumbID: ${img.thumbid || 'N/A'}`);
      });
    }

    if (hq.length > 0) {
      console.log(`\n--- HQ Images (${hq.length}) ---`);
      hq.forEach((img: any) => {
        console.log(`  ID: ${img.id}, Path: ${img.path}`);
        console.log(`    Dimensions: ${img.width} × ${img.height}px`);
        console.log(`    Size: ${img.sz ? (img.sz / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}`);
        console.log(`    Description: ${img.description || 'N/A'}`);
      });
    }

    if (thumbs.length > 0) {
      console.log(`\n--- Thumbnails (${thumbs.length}) ---`);
      thumbs.forEach((img: any) => {
        console.log(`  ID: ${img.id}, Path: ${img.path}`);
        console.log(`    Dimensions: ${img.width} × ${img.height}px`);
        console.log(`    ThumbID (linked to): ${img.thumbid || 'N/A'}`);
      });
    }

    // Check path patterns
    console.log('\n=== Path Analysis ===');
    if (gallery.length > 0) {
      const firstGallery = gallery[0];
      console.log(`First gallery path: ${firstGallery.path}`);
      console.log(`  Starts with /: ${firstGallery.path?.startsWith('/')}`);
      console.log(`  Contains securepic: ${firstGallery.path?.includes('securepic')}`);
      console.log(`  Contains newpic: ${firstGallery.path?.includes('newpic')}`);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

checkActress1().catch(console.error);

