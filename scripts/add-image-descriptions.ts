/**
 * Script to add description column to images table and backfill existing images
 * Description format: "2557 × 3308 px (24.2 MB)"
 * Only for images where longer side > 1200px
 * 
 * Usage: tsx scripts/add-image-descriptions.ts
 */

import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Helper function to format image description
function formatImageDescription(width: number, height: number, fileSizeBytes: number): string {
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
  return `${width} × ${height} px (${fileSizeMB} MB)`;
}

async function addDescriptions() {
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    console.log('Adding description column to images table...');
    
    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE images 
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL
    `);

    console.log('✓ Description column added (or already exists)');

    // Backfill descriptions for existing images where longer side > 1200px
    console.log('\nBackfilling descriptions for existing images...');
    
    // Get all images that need descriptions
    const imagesToUpdate = await client.query(`
      SELECT id, width, height, sz
      FROM images
      WHERE (width > 1200 OR height > 1200)
        AND width IS NOT NULL 
        AND height IS NOT NULL 
        AND sz IS NOT NULL
        AND description IS NULL
        AND mytp IN (4, 5) -- Only gallery and HQ images
    `);

    let updated = 0;
    for (const row of imagesToUpdate.rows) {
      const description = formatImageDescription(row.width, row.height, row.sz);
      await client.query(
        `UPDATE images SET description = $1 WHERE id = $2`,
        [description, row.id]
      );
      updated++;
    }

    console.log(`✓ Updated ${updated} images with descriptions`);

    // Show some examples
    const examples = await client.query(`
      SELECT id, girlid, width, height, sz, description, mytp
      FROM images
      WHERE description IS NOT NULL
      ORDER BY id DESC
      LIMIT 5
    `);

    if (examples.rows.length > 0) {
      console.log('\nExample descriptions:');
      examples.rows.forEach((row: any) => {
        console.log(`  Image ID ${row.id} (Girl ${row.girlid}, mytp=${row.mytp}): ${row.description}`);
      });
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

addDescriptions().catch(console.error);

