/**
 * Test the headshot API for specific "Their Man" entries
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import pool from '@/lib/db';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testHeadshotAPI(actressId: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check database query (same as headshot API)
    const [headshotResults] = await pool.execute(
      `SELECT path, width, height 
       FROM images 
       WHERE girlid = ? 
         AND path IS NOT NULL 
         AND path != ''
         AND (
           path ILIKE '%headshot.jpg' 
           OR path ILIKE '%headshot.jpeg'
           OR path ILIKE '%headshot.png'
         )
       LIMIT 1`,
      [actressId]
    ) as any[];

    console.log(`\n[${actressId}] Database query results:`);
    if (Array.isArray(headshotResults) && headshotResults.length > 0) {
      const h = headshotResults[0];
      console.log(`  ✓ Found: ${h.path} (${h.width}x${h.height})`);
      
      // Check if file exists in Supabase
      const cleanPath = h.path.startsWith('/') ? h.path.slice(1) : h.path;
      const { data, error } = await supabase.storage
        .from('glamourgirls_images')
        .download(cleanPath);
      
      if (error) {
        console.log(`  ✗ Supabase error: ${error.message}`);
      } else if (data) {
        const arrayBuffer = await data.arrayBuffer();
        console.log(`  ✓ File exists in Supabase (${arrayBuffer.byteLength} bytes)`);
      } else {
        console.log(`  ✗ File not found in Supabase`);
      }
    } else {
      console.log(`  ✗ No headshot found in database`);
      
      // Check for fallback gallery images
      const [portraitResults] = await pool.execute(
        `SELECT path, width, height 
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
      
      if (Array.isArray(portraitResults) && portraitResults.length > 0) {
        console.log(`  ⚠️  Would fallback to: ${portraitResults[0].path}`);
      }
    }
  } catch (error: any) {
    console.error(`  Error: ${error.message}`);
  }
}

async function main() {
  // Test the problematic entries from the image
  const testIds = [260, 272, 271, 632]; // Johnny Stompanato, Ramfis, Rhadamés, Teddy
  
  for (const id of testIds) {
    await testHeadshotAPI(id);
  }
  
  await pool.end();
}

main();



