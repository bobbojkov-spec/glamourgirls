import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProcessResult {
  actressId: number;
  success: boolean;
  message: string;
}

async function processHeadshot(actressId: number, headshotPath: string): Promise<ProcessResult> {
  try {
    // Check if already in database
    const existing = await pool.query(
      `SELECT id FROM images 
       WHERE girlid = $1 
         AND (path ILIKE '%headshot.jpg%' OR path ILIKE '%headshot.jpeg%' OR path ILIKE '%headshot.png%')
       LIMIT 1`,
      [actressId]
    );

    if (existing.rows.length > 0) {
      return {
        actressId,
        success: false,
        message: 'Already in database',
      };
    }

    // Read the headshot file
    const imageBuffer = await fs.readFile(headshotPath);
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        actressId,
        success: false,
        message: 'Invalid image dimensions',
      };
    }

    // Determine the folder name (securepic or newpic)
    const folderName = headshotPath.includes('securepic') ? 'securepic' : 'newpic';
    const storagePath = `${folderName}/${actressId}/headshot.jpg`;
    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;

    // Check if already in Supabase by trying to download it
    const { data: existingFile, error: downloadError } = await supabase.storage
      .from('glamourgirls_images')
      .download(storagePath);

    if (!existingFile || downloadError) {
      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from('glamourgirls_images')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        return {
          actressId,
          success: false,
          message: `Upload error: ${uploadError.message}`,
        };
      }
    }

    // Insert into database
    await pool.query(
      `INSERT INTO images (girlid, path, width, height, mytp, sz, mimetype)
       VALUES ($1, $2, $3, $4, 3, $5, $6)`,
      [
        actressId,
        dbPath,
        metadata.width,
        metadata.height,
        imageBuffer.length,
        metadata.format === 'jpeg' ? 'image/jpeg' : `image/${metadata.format}`,
      ]
    );

    return {
      actressId,
      success: true,
      message: `Added: ${metadata.width}x${metadata.height}px`,
    };
  } catch (error: any) {
    return {
      actressId,
      success: false,
      message: error.message || 'Unknown error',
    };
  }
}

async function main() {
  console.log('🔍 Finding all headshot.jpg files in old directories...\n');

  const securepicDir = '/Users/borislavbojkov/dev/gg_old_securepic';
  const newpicDir = '/Users/borislavbojkov/dev/gg_old_newpic';

  const headshots: Array<{ actressId: number; path: string }> = [];

  // Scan securepic directory
  try {
    const securepicFolders = await fs.readdir(securepicDir);
    for (const folder of securepicFolders) {
      const actressId = parseInt(folder);
      if (isNaN(actressId)) continue;

      const headshotPath = path.join(securepicDir, folder, 'headshot.jpg');
      try {
        await fs.access(headshotPath);
        headshots.push({ actressId, path: headshotPath });
      } catch {
        // File doesn't exist, skip
      }
    }
  } catch (error) {
    console.error('Error scanning securepic:', error);
  }

  // Scan newpic directory
  try {
    const newpicFolders = await fs.readdir(newpicDir);
    for (const folder of newpicFolders) {
      const actressId = parseInt(folder);
      if (isNaN(actressId)) continue;

      const headshotPath = path.join(newpicDir, folder, 'headshot.jpg');
      try {
        await fs.access(headshotPath);
        // Only add if not already found in securepic
        if (!headshots.find(h => h.actressId === actressId)) {
          headshots.push({ actressId, path: headshotPath });
        }
      } catch {
        // File doesn't exist, skip
      }
    }
  } catch (error) {
    console.error('Error scanning newpic:', error);
  }

  console.log(`Found ${headshots.length} headshot.jpg files\n`);
  console.log('Processing...\n');

  const results: ProcessResult[] = [];
  let processed = 0;

  for (const { actressId, path: headshotPath } of headshots) {
    processed++;
    const result = await processHeadshot(actressId, headshotPath);
    results.push(result);

    if (result.success) {
      console.log(`✓ [${processed}/${headshots.length}] ${actressId}: ${result.message}`);
    } else if (result.message !== 'Already in database') {
      console.log(`✗ [${processed}/${headshots.length}] ${actressId}: ${result.message}`);
    }

    // Small delay to avoid overwhelming the database
    if (processed % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const alreadyExists = results.filter(r => r.message === 'Already in database').length;
  const failed = results.filter(r => !r.success && r.message !== 'Already in database').length;

  console.log(`  ✓ Added to database: ${successful}`);
  console.log(`  ⊘ Already in database: ${alreadyExists}`);
  console.log(`  ✗ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed entries:');
    results
      .filter(r => !r.success && r.message !== 'Already in database')
      .forEach(r => console.log(`  - ${r.actressId}: ${r.message}`));
  }

  await pool.end();
}

main().catch(console.error);

