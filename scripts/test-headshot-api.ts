/**
 * Test the headshot API endpoint for entries that have headshots in the database
 * This helps identify why some entries show placeholder instead of their actual headshot
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
});

async function testHeadshotAPI() {
  console.log('🧪 Testing headshot API for entries with headshots in database...\n');

  try {
    // Get entries with headshots
    const result = await pool.query(`
      SELECT DISTINCT g.id, g.nm as name, g.theirman
      FROM girls g
      INNER JOIN images i ON i.girlid = g.id
      WHERE g.published = 2
        AND i.path IS NOT NULL
        AND i.path != ''
        AND (
          i.path ILIKE '%headshot.jpg'
          OR i.path ILIKE '%headshot.jpeg'
          OR i.path ILIKE '%headshot.png'
        )
      ORDER BY g.id
      LIMIT 20
    `);

    console.log(`Testing ${result.rows.length} entries...\n`);

    const baseUrl = 'http://localhost:3000';
    let successCount = 0;
    let placeholderCount = 0;
    const placeholderSize = 6953; // Known placeholder size

    for (const row of result.rows) {
      const url = `${baseUrl}/api/actresses/${row.id}/headshot`;
      
      try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const size = buffer.byteLength;
        
        // Check if it's a placeholder (exact size match or very close)
        const isPlaceholder = Math.abs(size - placeholderSize) < 100;
        
        if (isPlaceholder) {
          placeholderCount++;
          console.log(`❌ ID ${row.id} (${row.name}): Returns placeholder (${size} bytes)`);
        } else {
          successCount++;
          if (row.id === 719 || row.id <= 10) {
            // Only log first few and 719 for debugging
            console.log(`✅ ID ${row.id} (${row.name}): Returns headshot (${size} bytes)`);
          }
        }
      } catch (error: any) {
        console.log(`❌ ID ${row.id} (${row.name}): Error - ${error.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Headshots returned: ${successCount}`);
    console.log(`   ❌ Placeholders returned: ${placeholderCount}`);
    console.log(`   Total tested: ${result.rows.length}`);

    // Test specific entry 719
    console.log(`\n🧪 Detailed test for entry 719:`);
    const entry719 = result.rows.find((r) => r.id === 719);
    if (entry719) {
      const url = `${baseUrl}/api/actresses/719/headshot`;
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Size: ${buffer.byteLength} bytes`);
      console.log(`   Is placeholder: ${Math.abs(buffer.byteLength - placeholderSize) < 100}`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testHeadshotAPI();

