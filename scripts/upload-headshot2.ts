/**
 * Script to upload headshot2 for actress 729
 * Usage: tsx scripts/upload-headshot2.ts <actressId>
 */

import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
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

async function uploadHeadshot2(actressId: number) {
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
    // Get the current headshot from database
    const headshotResult = await client.query(
      `SELECT path FROM images 
       WHERE girlid = $1 AND path ILIKE '%headshot%' 
       ORDER BY id DESC LIMIT 1`,
      [actressId]
    );

    if (!headshotResult.rows || headshotResult.rows.length === 0) {
      console.error('No headshot found for actress', actressId);
      process.exit(1);
    }

    const headshotPath = headshotResult.rows[0].path;
    console.log(`Found headshot: ${headshotPath}`);

    // Fetch from Supabase storage
    const { fetchFromStorage } = await import('../src/lib/supabase/storage');
    const imageBuffer = await fetchFromStorage(headshotPath);
    
    if (!imageBuffer) {
      console.error('Failed to fetch headshot from storage');
      process.exit(1);
    }

    console.log(`Fetched headshot, size: ${imageBuffer.length} bytes`);

    // Upload as headshot2
    const folderName = 'securepic';
    const storagePath = `${folderName}/${actressId}/headshot2.jpg`;
    await uploadToSupabase(supabase, 'glamourgirls_images', storagePath, imageBuffer);
    
    const dbPath = `/${folderName}/${actressId}/headshot2.jpg`;

    const metadata = await sharp(imageBuffer).metadata();

    await client.query('BEGIN');
    
    // Delete existing headshot2 if it exists
    await client.query(
      `DELETE FROM images WHERE girlid = $1 AND path ILIKE '%headshot2%'`,
      [actressId]
    );
    
    // Insert headshot2 into database
    await client.query(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
       VALUES ($1, $2, $3, $4, 3, $5, $6)`,
      [actressId, dbPath, metadata.width || 190, metadata.height || 245, 'image/jpeg', imageBuffer.length]
    );

    await client.query('COMMIT');
    
    console.log(`✓ Headshot2 uploaded successfully`);
    console.log(`  Database path: ${dbPath}`);
    console.log(`  Supabase path: ${storagePath}`);
    console.log(`  Dimensions: ${metadata.width} × ${metadata.height}`);
    
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`✗ Error: ${error.message}`);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

const actressId = parseInt(process.argv[2]) || 729;
uploadHeadshot2(actressId).catch(console.error);

