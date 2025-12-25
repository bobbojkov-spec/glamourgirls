import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

/**
 * Script to upload existing headshot.jpg files from old directories to Supabase
 * For "Their Men" entries that have headshot.jpg in their folders but not in Supabase
 */

interface ProcessResult {
  actressId: number;
  name: string;
  success: boolean;
  message: string;
  skipped?: boolean;
}

async function uploadToSupabase(
  supabase: any,
  bucket: string,
  filePath: string,
  buffer: Buffer,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(cleanPath, buffer, {
      contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return cleanPath;
}

async function processExistingHeadshot(actressId: number, name: string): Promise<ProcessResult> {
  try {
    // Check if headshot already exists in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        actressId,
        name,
        success: false,
        message: 'Supabase configuration missing',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database for existing headshot path
    const [dbHeadshot] = await pool.execute(
      `SELECT path FROM images 
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

    let folderName = 'newpic'; // Default
    let headshotPath: string | null = null;

    if (Array.isArray(dbHeadshot) && dbHeadshot.length > 0) {
      const dbPath = dbHeadshot[0].path;
      // Extract folder name from path (e.g., /securepic/444/headshot.jpg -> securepic)
      const match = dbPath.match(/\/(newpic|securepic)\//);
      if (match) {
        folderName = match[1];
        headshotPath = dbPath;
      }
    }

    // Check if file exists in Supabase
    const storagePath = headshotPath ? headshotPath.replace(/^\//, '') : `${folderName}/${actressId}/headshot.jpg`;
    const { data: existingFile } = await supabase.storage
      .from('glamourgirls_images')
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        search: 'headshot.jpg'
      });

    // Check if file actually exists in storage
    const { data: fileData } = await supabase.storage
      .from('glamourgirls_images')
      .download(storagePath);

    if (fileData) {
      return {
        actressId,
        name,
        success: true,
        message: 'Headshot already exists in Supabase',
        skipped: true,
      };
    }

    // Look for headshot.jpg in old directories
    const oldDirs = [
      path.join('/Users/borislavbojkov/dev/gg_old_newpic', actressId.toString()),
      path.join('/Users/borislavbojkov/dev/gg_old_securepic', actressId.toString()),
    ];

    let headshotFile: string | null = null;
    let foundFolderName: string | null = null;

    for (const oldDir of oldDirs) {
      try {
        const headshotPath = path.join(oldDir, 'headshot.jpg');
        await fs.access(headshotPath);
        headshotFile = headshotPath;
        // Determine folder name
        if (oldDir.includes('securepic')) {
          foundFolderName = 'securepic';
        } else {
          foundFolderName = 'newpic';
        }
        break;
      } catch {
        continue;
      }
    }

    if (!headshotFile || !foundFolderName) {
      return {
        actressId,
        name,
        success: false,
        message: 'headshot.jpg not found in old directories',
      };
    }

    console.log(`  Found headshot.jpg for ${actressId} (${name}) in ${foundFolderName}`);

    // Read the headshot file
    const headshotBuffer = await fs.readFile(headshotFile);
    const metadata = await sharp(headshotBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        actressId,
        name,
        success: false,
        message: 'Invalid image dimensions',
      };
    }

    // Upload to Supabase
    const uploadPath = `${foundFolderName}/${actressId}/headshot.jpg`;
    
    try {
      await uploadToSupabase(supabase, 'glamourgirls_images', uploadPath, headshotBuffer, 'image/jpeg');
    } catch (uploadError: any) {
      return {
        actressId,
        name,
        success: false,
        message: `Failed to upload: ${uploadError.message}`,
      };
    }

    // Update database if path doesn't match
    if (!headshotPath || headshotPath !== `/${uploadPath}`) {
      try {
        const [existing] = await pool.execute(
          `SELECT id FROM images WHERE girlid = ? AND (path LIKE '%headshot.jpg%' OR path LIKE '%headshot.jpeg%') LIMIT 1`,
          [actressId]
        ) as any[];

        if (Array.isArray(existing) && existing.length > 0) {
          // Update existing
          await pool.execute(
            `UPDATE images 
             SET path = ?, width = ?, height = ?, sz = ?
             WHERE id = ?`,
            [
              `/${uploadPath}`,
              metadata.width,
              metadata.height,
              headshotBuffer.length,
              existing[0].id,
            ]
          );
        } else {
          // Insert new
          await pool.execute(
            `INSERT INTO images (girlid, path, width, height, mytp, sz)
             VALUES (?, ?, ?, ?, 3, ?)`,
            [
              actressId,
              `/${uploadPath}`,
              metadata.width,
              metadata.height,
              headshotBuffer.length,
            ]
          );
        }
      } catch (dbError) {
        console.error(`  ⚠️  Database error:`, dbError);
      }
    }

    return {
      actressId,
      name,
      success: true,
      message: `Uploaded: ${metadata.width}x${metadata.height}px`,
    };
  } catch (error: any) {
    return {
      actressId,
      name,
      success: false,
      message: error.message || 'Unknown error',
    };
  }
}

async function main() {
  console.log('🔍 Finding "Their Men" entries with headshot.jpg in old directories...\n');
  
  // Get all "Their Men" entries
  const [theirMenEntries] = await pool.execute(
    `SELECT g.id, g.nm, g.firstname, g.familiq
     FROM girls g
     WHERE g.published = 2
       AND g.theirman = true
     ORDER BY g.id ASC`
  ) as any[];

  const entries = Array.isArray(theirMenEntries) ? theirMenEntries : [];
  
  if (entries.length === 0) {
    console.log('No "Their Men" entries found!');
    process.exit(0);
  }

  console.log(`Checking ${entries.length} "Their Men" entries for existing headshot.jpg files\n`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: number; name: string; message: string }> = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const actressId = Number(entry.id);
    const name = `${entry.firstname || ''} ${entry.familiq || ''}`.trim() || entry.nm || `ID ${actressId}`;
    const progress = `[${i + 1}/${entries.length}]`;

    process.stdout.write(`${progress} Checking ${actressId} (${name})...`);

    const result = await processExistingHeadshot(actressId, name);

    if (result.success) {
      if (result.skipped) {
        skippedCount++;
        console.log(` ✓ SKIPPED: ${result.message}`);
      } else {
        successCount++;
        console.log(` ✓ SUCCESS: ${result.message}`);
      }
    } else {
      errorCount++;
      errors.push({ id: actressId, name, message: result.message });
      console.log(` ✗ ERROR: ${result.message}`);
    }
  }

  console.log(`\n\n📊 SUMMARY`);
  console.log('='.repeat(80));
  console.log(`Total checked: ${entries.length}`);
  console.log(`Uploaded: ${successCount}`);
  console.log(`Skipped (already in Supabase): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS:`);
    errors.forEach(err => {
      console.log(`  ID ${err.id} (${err.name}): ${err.message}`);
    });
  }

  console.log('\n✅ Done!');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

