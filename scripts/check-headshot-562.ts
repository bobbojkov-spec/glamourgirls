import dotenv from 'dotenv';
import path from 'path';
import pool from '@/lib/db';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function checkHeadshot() {
  const girlId = 562;
  
  console.log(`Checking headshot for girl ID ${girlId}...\n`);
  
  // Check database for headshot
  const [rows] = await pool.execute(
    `SELECT id, path, width, height, mytp
     FROM images
     WHERE girlid = ?
       AND path IS NOT NULL
       AND path != ''
       AND (
         path ILIKE '%headshot%'
         OR mytp = 3
       )
     ORDER BY 
       CASE WHEN path ILIKE '%headshot.jpg' THEN 1 ELSE 2 END,
       id ASC`,
    [girlId]
  ) as any[];
  
  console.log(`Found ${rows.length} image(s) in database:\n`);
  
  for (const row of rows) {
    console.log(`  ID: ${row.id}`);
    console.log(`  Path: ${row.path}`);
    console.log(`  Dimensions: ${row.width}×${row.height}`);
    console.log(`  Type: ${row.mytp} (3=thumbnail/headshot, 4=gallery, 5=HQ)`);
    console.log('');
  }
  
  // Also check for any images with small dimensions (potential small headshot)
  const [smallRows] = await pool.execute(
    `SELECT id, path, width, height, mytp
     FROM images
     WHERE girlid = ?
       AND width < 300
       AND height < 400
       AND path IS NOT NULL
       AND path != ''
     ORDER BY id ASC`,
    [girlId]
  ) as any[];
  
  if (smallRows.length > 0) {
    console.log(`Found ${smallRows.length} small image(s) (potential headshot):\n`);
    for (const row of smallRows) {
      console.log(`  Path: ${row.path} (${row.width}×${row.height})`);
    }
  }
  
  await pool.end();
}

checkHeadshot().catch(console.error);

