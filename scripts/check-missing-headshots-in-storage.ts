/**
 * Check which entries have headshots in the database but not in Supabase storage
 * This helps identify why some entries show placeholder instead of their actual headshot
 */

import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
});

async function checkHeadshots() {
  console.log('🔍 Checking headshots in database vs Supabase storage...\n');

  try {
    // Get all entries with headshots in database
    const result = await pool.query(`
      SELECT g.id, g.nm as name, g.theirman,
        i.path, i.width, i.height
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
    `);

    console.log(`Found ${result.rows.length} entries with headshots in database\n`);

    const missing: Array<{ id: number; name: string; path: string }> = [];
    const present: Array<{ id: number; name: string; path: string }> = [];

    for (const row of result.rows) {
      const dbPath = row.path;
      // Remove leading slash for Supabase path
      const storagePath = dbPath.startsWith('/') ? dbPath.slice(1) : dbPath;

      // Check if file exists in Supabase storage
      const { data, error } = await supabase.storage
        .from('glamourgirls_images')
        .list(storagePath.split('/').slice(0, -1).join('/'), {
          limit: 1000,
          search: storagePath.split('/').pop() || '',
        });

      const fileName = storagePath.split('/').pop() || '';
      const exists = data?.some((file) => file.name === fileName) || false;

      if (exists) {
        present.push({ id: row.id, name: row.name, path: dbPath });
      } else {
        missing.push({ id: row.id, name: row.name, path: dbPath });
        console.log(`❌ Missing: ID ${row.id} (${row.name}) - ${dbPath}`);
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`   Present in storage: ${present.length}`);
    console.log(`   Missing from storage: ${missing.length}`);

    if (missing.length > 0) {
      console.log(`\n📋 Missing headshots:`);
      missing.forEach((m) => {
        console.log(`   - ID ${m.id}: ${m.name} (${m.path})`);
      });
    }

    // Test a specific entry (719)
    console.log(`\n🧪 Testing entry 719 (Lorraine Crawford):`);
    const entry719 = result.rows.find((r) => r.id === 719);
    if (entry719) {
      const storagePath719 = entry719.path.startsWith('/')
        ? entry719.path.slice(1)
        : entry719.path;
      const { data: data719, error: error719 } = await supabase.storage
        .from('glamourgirls_images')
        .download(storagePath719);

      if (error719) {
        console.log(`   ❌ Error: ${error719.message}`);
      } else if (data719) {
        const buffer = await data719.arrayBuffer();
        console.log(`   ✅ Found in storage: ${buffer.byteLength} bytes`);
      } else {
        console.log(`   ❌ Not found in storage`);
      }

      // Test public URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${storagePath719}`;
      console.log(`   📍 Public URL: ${publicUrl}`);
      try {
        const response = await fetch(publicUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          console.log(`   ✅ Public URL accessible: ${buffer.byteLength} bytes`);
        } else {
          console.log(`   ❌ Public URL failed: ${response.status} ${response.statusText}`);
        }
      } catch (e: any) {
        console.log(`   ❌ Public URL error: ${e.message}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

checkHeadshots();

