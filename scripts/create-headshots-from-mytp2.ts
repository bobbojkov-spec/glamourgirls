/**
 * Script to create headshots from old folder GIF files for actresses missing headshots
 * 
 * This script:
 * 1. Looks in old folders (gg_old_securepic, gg_old_newpic) for actress folders
 * 2. Finds the two GIF files (first is landscape name card, second is portrait headshot)
 * 3. Always uses the SECOND GIF (the portrait headshot)
 * 4. Crops it (top 30px, right 30px, left 25px, bottom 25px)
 * 5. Processes it to headshot format (190x245px JPEG)
 * 6. Uploads as headshot.jpg with mytp=3
 * 
 * Usage: tsx scripts/create-headshots-from-mytp2.ts [actressId1] [actressId2] ...
 *        tsx scripts/create-headshots-from-mytp2.ts 564 528 649 558
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

interface ProcessResult {
  actressId: number;
  name: string;
  success: boolean;
  message: string;
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

async function createHeadshotFromOldFolder(actressId: number, overwrite: boolean = false): Promise<ProcessResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return {
      actressId,
      name: '',
      success: false,
      message: 'Missing Supabase credentials',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get actress name
    const [actressResults] = await pool.execute(
      `SELECT id, nm as name, firstname, familiq 
       FROM girls 
       WHERE id = ?`,
      [actressId]
    ) as any[];

    const actress = Array.isArray(actressResults) && actressResults.length > 0 
      ? actressResults[0] 
      : null;

    if (!actress) {
      return {
        actressId,
        name: '',
        success: false,
        message: 'Actress not found in database',
      };
    }

    const name = actress.name || `${actress.firstname || ''} ${actress.familiq || ''}`.trim();

    // Check if headshot already exists
    const [existingHeadshot] = await pool.execute(
      `SELECT id FROM images 
       WHERE girlid = ? 
         AND (path ILIKE '%headshot.jpg%' OR path ILIKE '%headshot.jpeg%' OR mytp = 3)
       LIMIT 1`,
      [actressId]
    ) as any[];

    if (Array.isArray(existingHeadshot) && existingHeadshot.length > 0) {
      if (!overwrite) {
        return {
          actressId,
          name,
          success: false,
          message: 'Headshot already exists (use --overwrite to regenerate)',
        };
      }
      // If overwriting, delete the existing headshot
      console.log(`  [${actressId}] Headshot exists, overwriting...`);
      await pool.execute(
        `DELETE FROM images WHERE girlid = ? AND (path ILIKE '%headshot.jpg%' OR path ILIKE '%headshot.jpeg%' OR mytp = 3)`,
        [actressId]
      );
    }

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
      return {
        actressId,
        name,
        success: false,
        message: `Folder not found in old directories for ${actressId}`,
      };
    }

    console.log(`  [${actressId}] ${name}: Found folder: ${actressFolder}`);

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

    let imageBuffer: Buffer;
    let usingPlaceholder = false;

    if (gifFiles.length < 2) {
      // No second GIF found - use placeholder portrait for "their men"
      console.log(`  [${actressId}] Only ${gifFiles.length} GIF found, using placeholder portrait`);
      const placeholderPath = path.join(process.cwd(), 'public', 'images', 'placeholder-man-portrait.png');
      
      try {
        imageBuffer = await fs.readFile(placeholderPath);
        usingPlaceholder = true;
        console.log(`  [${actressId}] Using placeholder: placeholder-man-portrait.png`);
      } catch (placeholderError) {
        return {
          actressId,
          name,
          success: false,
          message: `No second GIF found and placeholder file not found at ${placeholderPath}`,
        };
      }
    } else {
      // Always use the SECOND GIF (index 1) - first is landscape name card, second is portrait headshot
      const secondGifFile = gifFiles[1];
      const sourceImagePath = path.join(actressFolder, secondGifFile);

      console.log(`  [${actressId}] Using second GIF: ${secondGifFile} (${gifFiles.length} GIFs found)`);

      // Read the image
      imageBuffer = await fs.readFile(sourceImagePath);
    }

    // Get image metadata
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return {
        actressId,
        name,
        success: false,
        message: 'Invalid image dimensions',
      };
    }

    console.log(`  [${actressId}] Original dimensions: ${metadata.width} × ${metadata.height}`);

    let headshotBuffer: Buffer;

    if (usingPlaceholder) {
      // For placeholder, just resize to target dimensions (no cropping needed)
      console.log(`  [${actressId}] Resizing placeholder to ${TARGET_WIDTH}x${TARGET_HEIGHT}px`);
      headshotBuffer = await sharp(imageBuffer)
        .resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'cover', // Cover the area to ensure exact dimensions
        })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
    } else {
      // Crop parameters: top 30px, right 30px, left 25px, bottom 25px
      const cropLeft = 25;
      const cropTop = 30;
      const cropRight = 30;
      const cropBottom = 25;

      const cropWidth = metadata.width - cropLeft - cropRight;
      const cropHeight = metadata.height - cropTop - cropBottom;

      // Validate crop dimensions
      if (cropWidth <= 0 || cropHeight <= 0 || 
          cropLeft + cropWidth > metadata.width || 
          cropTop + cropHeight > metadata.height) {
        return {
          actressId,
          name,
          success: false,
          message: `Invalid crop dimensions: ${metadata.width}x${metadata.height} -> ${cropWidth}x${cropHeight}`,
        };
      }

      console.log(`  [${actressId}] Cropping: left=${cropLeft}, top=${cropTop}, right=${cropRight}, bottom=${cropBottom}`);

      // Crop the image first
      const croppedBuffer = await sharp(imageBuffer)
        .extract({
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight,
        })
        .toBuffer();

      const croppedMeta = await sharp(croppedBuffer).metadata();
      console.log(`  [${actressId}] After crop: ${croppedMeta.width} × ${croppedMeta.height}`);

      // Now resize to target dimensions (190x245px)
      headshotBuffer = await sharp(croppedBuffer)
        .resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'cover', // Cover the area to ensure exact dimensions
        })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
    }

    const finalMetadata = await sharp(headshotBuffer).metadata();
    console.log(`  [${actressId}] Final dimensions: ${finalMetadata.width} × ${finalMetadata.height}`);

    const headshotStoragePath = `${folderName}/${actressId}/headshot.jpg`;
    const headshotDbPath = `/${folderName}/${actressId}/headshot.jpg`;

    // Upload to Supabase
    await uploadToSupabase(supabase, 'glamourgirls_images', headshotStoragePath, headshotBuffer, 'image/jpeg');
    console.log(`  [${actressId}] ✓ Headshot uploaded to: ${headshotStoragePath}`);

    // Insert headshot into database (as thumbnail type, mytp = 3)
    await pool.execute(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
       VALUES (?, ?, ?, ?, 3, ?, ?)`,
      [
        actressId,
        headshotDbPath,
        finalMetadata.width || TARGET_WIDTH,
        finalMetadata.height || TARGET_HEIGHT,
        'image/jpeg',
        headshotBuffer.length
      ]
    );

    console.log(`  [${actressId}] ✓ Headshot saved to database`);

    return {
      actressId,
      name,
      success: true,
      message: usingPlaceholder 
        ? `Headshot created from placeholder: ${finalMetadata.width}x${finalMetadata.height}px`
        : `Headshot created: ${finalMetadata.width}x${finalMetadata.height}px`,
    };
  } catch (error: any) {
    return {
      actressId,
      name: '',
      success: false,
      message: error?.message || 'Unknown error',
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  // Check for flags
  const overwrite = args.includes('--overwrite');
  const theirMen = args.includes('--their-men') || args.includes('--all-their-men');
  
  // Filter out flags from IDs
  const idArgs = args.filter(arg => !arg.startsWith('--'));
  
  let actressIds: number[] = [];

  // Check if user wants all "their men" actresses
  if (theirMen) {
    console.log('🔍 Fetching all "Their Men" actresses from database...\n');
    
    const [theirMenResults] = await pool.execute(
      `SELECT g.id, g.nm, g.firstname, g.familiq
       FROM girls g
       WHERE g.published = 2
         AND g.theirman = true
       ORDER BY g.id ASC`
    ) as any[];

    const theirMenEntries = Array.isArray(theirMenResults) ? theirMenResults : [];
    
    if (theirMenEntries.length === 0) {
      console.log('❌ No "Their Men" entries found in database');
      await pool.end();
      process.exit(1);
    }

    actressIds = theirMenEntries.map((row: any) => Number(row.id));
    console.log(`✓ Found ${actressIds.length} "Their Men" actresses\n`);
  } else if (idArgs.length > 0) {
    // Use provided IDs
    actressIds = idArgs.map(id => parseInt(id)).filter(id => !isNaN(id));
  } else {
    // Default to the 4 actresses mentioned
    actressIds = [564, 528, 649, 558]; // Gwili Andre, Claudia Dell, Betty Furness, Claire Maynard
  }

  if (actressIds.length === 0) {
    console.error('No valid actress IDs provided');
    console.error('Usage: tsx scripts/create-headshots-from-mytp2.ts [--their-men] [--overwrite] [id1] [id2] ...');
    console.error('  --their-men: Process all "their men" actresses');
    console.error('  --overwrite: Overwrite existing headshots');
    await pool.end();
    process.exit(1);
  }

  console.log(`Creating headshots from old folder GIF files for ${actressIds.length} actresses...\n`);
  if (overwrite) {
    console.log('⚠️  OVERWRITE mode: Existing headshots will be regenerated\n');
  }
  console.log(`Looking in old directories: ${OLD_DIRECTORIES.join(', ')}\n`);
  if (actressIds.length <= 20) {
    console.log(`Actress IDs: ${actressIds.join(', ')}\n`);
  } else {
    console.log(`Actress IDs: ${actressIds.slice(0, 10).join(', ')} ... and ${actressIds.length - 10} more\n`);
  }

  const results: ProcessResult[] = [];

  for (let i = 0; i < actressIds.length; i++) {
    const actressId = actressIds[i];
    const progress = `[${i + 1}/${actressIds.length}]`;
    console.log(`${progress} Processing actress ${actressId}...`);
    const result = await createHeadshotFromOldFolder(actressId, overwrite);
    results.push(result);
    console.log(`  Result: ${result.success ? '✓ SUCCESS' : '✗ FAILED'} - ${result.message}\n`);
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✓ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`  [${r.actressId}] ${r.name}: ${r.message}`);
  });

  if (failed.length > 0) {
    console.log(`\n✗ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`  [${r.actressId}] ${r.name || 'Unknown'}: ${r.message}`);
    });
  }

  // Close database connection
  await pool.end();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

