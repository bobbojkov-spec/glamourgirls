/**
 * Check what headshots exist for "Their Man" entries
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import pool from '@/lib/db';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all "Their Man" entries
    const [results] = await pool.execute(`
      SELECT g.id, g.nm as name, g.theirman
      FROM girls g
      WHERE g.published = 2
        AND g.theirman = true
      ORDER BY g.id
    `) as any[];

    const theirMen = Array.isArray(results) ? results : [];
    console.log(`Found ${theirMen.length} "Their Man" entries\n`);

    for (const entry of theirMen) {
      const entryId = Number(entry.id);
      const name = String(entry.name || '');

      // Check database for headshot
      const [headshotResults] = await pool.execute(
        `SELECT path, mytp, width, height 
         FROM images 
         WHERE girlid = ? 
           AND (
             path ILIKE '%headshot%' 
             OR mytp = 3
           )
         ORDER BY 
           CASE 
             WHEN path ILIKE '%headshot.jpg%' THEN 1
             WHEN path ILIKE '%headshot%' THEN 2
             ELSE 3
           END
         LIMIT 5`,
        [entryId]
      ) as any[];

      const headshots = Array.isArray(headshotResults) ? headshotResults : [];
      
      // Check Supabase storage
      let supabaseHeadshot = false;
      for (const folder of ['securepic', 'newpic']) {
        const { data: files } = await supabase.storage
          .from('glamourgirls_images')
          .list(`${folder}/${entryId}`, { limit: 100 });
        
        if (files) {
          const hasHeadshot = files.some(f => f.name.toLowerCase() === 'headshot.jpg');
          if (hasHeadshot) {
            supabaseHeadshot = true;
            break;
          }
        }
      }

      console.log(`[${entryId}] ${name}`);
      console.log(`  Database headshots: ${headshots.length}`);
      headshots.forEach((h: any) => {
        console.log(`    - ${h.path} (mytp=${h.mytp}, ${h.width}x${h.height})`);
      });
      console.log(`  Supabase headshot.jpg: ${supabaseHeadshot ? '✓' : '✗'}`);
      
      // Check for GIFs
      let gifCount = 0;
      for (const folder of ['securepic', 'newpic']) {
        const { data: files } = await supabase.storage
          .from('glamourgirls_images')
          .list(`${folder}/${entryId}`, { limit: 100 });
        
        if (files) {
          const gifs = files.filter(f => f.name.toLowerCase().endsWith('.gif'));
          gifCount += gifs.length;
        }
      }
      console.log(`  GIF files: ${gifCount}`);
      console.log('');
    }

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

