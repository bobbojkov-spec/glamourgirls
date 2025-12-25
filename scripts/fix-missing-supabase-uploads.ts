/**
 * Script to upload existing local images to Supabase storage
 * For images that are in database but not in Supabase
 * Usage: tsx scripts/fix-missing-supabase-uploads.ts <actressId>
 * Example: tsx scripts/fix-missing-supabase-uploads.ts 1
 */

import { readFile, stat } from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getPool } from '../src/lib/db';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return cleanPath;
}

async function fixMissingUploads(actressId: number) {
  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const pgPool = getPool();
  const client = await pgPool.connect();

  try {
    // Get all images for this actress
    const result = await client.query(
      `SELECT id, path, mytp, mimetype
       FROM images 
       WHERE girlid = $1 
         AND path IS NOT NULL 
         AND path != ''
         AND mytp IN (3, 4, 5)
       ORDER BY id ASC`,
      [actressId]
    );

    console.log(`Found ${result.rows.length} images for actress ${actressId}\n`);

    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const img of result.rows) {
      try {
        const dbPath = img.path;
        const mytp = img.mytp;
        const mimetype = img.mimetype || 'image/jpeg';
        
        // Determine bucket based on image type
        let bucket: string;
        if (mytp === 5) {
          // HQ images go to images_raw bucket
          bucket = 'images_raw';
        } else {
          // Gallery and thumbnails go to glamourgirls_images bucket
          bucket = 'glamourgirls_images';
        }

        // Check if file exists locally
        const localPath = path.join(process.cwd(), 'public', dbPath.startsWith('/') ? dbPath.slice(1) : dbPath);
        
        try {
          await stat(localPath);
        } catch {
          console.log(`  ⚠ Skipping ${dbPath}: File not found locally`);
          skipped++;
          continue;
        }

        // Read file
        const buffer = await readFile(localPath);
        
        // Upload to Supabase
        const storagePath = dbPath.startsWith('/') ? dbPath.slice(1) : dbPath;
        await uploadToSupabase(supabase, bucket, storagePath, buffer, mimetype);
        
        console.log(`  ✓ Uploaded: ${dbPath} (${mytp === 5 ? 'HQ' : mytp === 4 ? 'Gallery' : 'Thumb'})`);
        uploaded++;
      } catch (error: any) {
        console.error(`  ✗ Error processing ${img.path}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Uploaded: ${uploaded}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

  } catch (error: any) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

const actressId = parseInt(process.argv[2]) || 1;
fixMissingUploads(actressId).catch(console.error);

