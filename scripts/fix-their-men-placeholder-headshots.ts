/**
 * Script to fix "their men" headshots that don't have a second GIF
 * Updates their headshot paths to use a placeholder image
 * 
 * Usage: tsx scripts/fix-their-men-placeholder-headshots.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const TARGET_WIDTH = 190;
const TARGET_HEIGHT = 245;

// Old folder locations
const OLD_DIRECTORIES = [
  '/Users/borislavbojkov/dev/gg_old_securepic',
  '/Users/borislavbojkov/dev/gg_old_newpic',
];

const PLACEHOLDER_PATH = '/hasnoheadshot.jpg'; // Universal placeholder path

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

async function checkHasSecondGif(actressId: number): Promise<{ hasSecondGif: boolean; folderName?: string }> {
  // Find actress folder in old directories
  let actressFolder: string | null = null;
  let folderName: string | null = null;

  for (const baseDir of OLD_DIRECTORIES) {
    const folder = path.join(baseDir, actressId.toString());
    try {
      await fs.access(folder);
      actressFolder = folder;
      // Determine folder name for Supabase path
      if (baseDir.includes('securepic')) {
        folderName = 'securepic';
      } else {
        folderName = 'newpic';
      }
      break;
    } catch {
      continue;
    }
  }

  if (!actressFolder || !folderName) {
    return { hasSecondGif: false };
  }

  // List all files in the folder
  const files = await fs.readdir(actressFolder);

  // Filter for GIF files and sort them
  const gifFiles = files
    .filter(f => f.toLowerCase().endsWith('.gif'))
    .sort((a, b) => {
      // Sort by filename (numeric if possible)
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

  return {
    hasSecondGif: gifFiles.length >= 2,
    folderName,
  };
}

async function createPlaceholderHeadshot(): Promise<Buffer> {
  // Read the placeholder-man-portrait.png
  const placeholderPath = path.join(process.cwd(), 'public', 'images', 'placeholder-man-portrait.png');
  const placeholderBuffer = await fs.readFile(placeholderPath);

  // Resize to target dimensions (190x245px) and convert to JPEG
  const headshotBuffer = await sharp(placeholderBuffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'cover',
    })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  return headshotBuffer;
}

async function main() {
  console.log('🔍 Finding "Their Men" entries and checking for second GIF...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get all "their men" actresses
  const [theirMenResults] = await pool.execute(
    `SELECT g.id, g.nm, g.firstname, g.familiq
     FROM girls g
     WHERE g.published = 2
       AND g.theirman = true
     ORDER BY g.id ASC`
  ) as any[];

  const theirMenEntries = Array.isArray(theirMenResults) ? theirMenResults : [];
  
  if (theirMenEntries.length === 0) {
    console.log('No "Their Men" entries found');
    await pool.end();
    process.exit(0);
  }

  console.log(`Found ${theirMenEntries.length} "Their Men" actresses\n`);

  // Create the universal placeholder headshot
  console.log('📦 Creating universal placeholder headshot...');
  const placeholderBuffer = await createPlaceholderHeadshot();
  const placeholderMetadata = await sharp(placeholderBuffer).metadata();
  console.log(`✓ Placeholder created: ${placeholderMetadata.width}×${placeholderMetadata.height}px\n`);

  // Upload placeholder to Supabase (at root level)
  console.log('⬆️  Uploading placeholder to Supabase...');
  try {
    await uploadToSupabase(supabase, 'glamourgirls_images', 'hasnoheadshot.jpg', placeholderBuffer, 'image/jpeg');
    console.log('✓ Placeholder uploaded to: hasnoheadshot.jpg\n');
  } catch (error: any) {
    console.error('Error uploading placeholder:', error.message);
    await pool.end();
    process.exit(1);
  }

  // Check each actress and update if needed
  const needsUpdate: Array<{ id: number; name: string }> = [];
  const hasSecondGif: Array<{ id: number; name: string }> = [];

  for (const entry of theirMenEntries) {
    const actressId = Number(entry.id);
    const name = entry.nm || `${entry.firstname || ''} ${entry.familiq || ''}`.trim();
    
    const { hasSecondGif: hasGif, folderName } = await checkHasSecondGif(actressId);
    
    if (hasGif) {
      hasSecondGif.push({ id: actressId, name });
      console.log(`✓ [${actressId}] ${name}: Has 2 GIFs (keeping current headshot)`);
    } else {
      needsUpdate.push({ id: actressId, name });
      console.log(`⚠️  [${actressId}] ${name}: No second GIF (will update to placeholder)`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Has 2 GIFs: ${hasSecondGif.length}`);
  console.log(`  Needs placeholder: ${needsUpdate.length}\n`);

  if (needsUpdate.length === 0) {
    console.log('✅ All entries have second GIFs, no updates needed');
    await pool.end();
    process.exit(0);
  }

  // Update database entries
  console.log('🔄 Updating headshots in database...\n');
  
  let updated = 0;
  let errors = 0;

  for (const { id: actressId, name } of needsUpdate) {
    try {
      // Delete existing headshot entries for this actress
      await pool.execute(
        `DELETE FROM images WHERE girlid = ? AND (path ILIKE '%headshot%' OR mytp = 3)`,
        [actressId]
      );

      // Insert new headshot entry pointing to the universal placeholder
      await pool.execute(
        `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
         VALUES (?, ?, ?, ?, 3, ?, ?)`,
        [
          actressId,
          PLACEHOLDER_PATH,
          placeholderMetadata.width || TARGET_WIDTH,
          placeholderMetadata.height || TARGET_HEIGHT,
          'image/jpeg',
          placeholderBuffer.length
        ]
      );

      console.log(`✓ [${actressId}] ${name}: Updated to ${PLACEHOLDER_PATH}`);
      updated++;
    } catch (error: any) {
      console.error(`✗ [${actressId}] ${name}: Error - ${error.message}`);
      errors++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);

  await pool.end();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

