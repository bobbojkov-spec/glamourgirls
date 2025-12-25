/**
 * Script to find published actresses without headshots and process GIFs from old files
 * 
 * This script:
 * 1. Finds all published actresses without headshots in the database
 * 2. Checks old file directories for GIF files (headshot.gif or second .gif)
 * 3. Processes the GIF (crop: top/right 30px, left/bottom 25px)
 * 4. Converts to JPG headshot
 * 5. Uploads to Supabase storage
 * 6. Updates database with headshot path
 * 
 * Usage: tsx scripts/find-and-process-missing-headshots.ts [--dry-run] [--limit N]
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface ProcessResult {
  actressId: number;
  name: string;
  success: boolean;
  message: string;
  skipped?: boolean;
}

const TARGET_WIDTH = 190;
const TARGET_HEIGHT = 245;

// Old file directory paths to check
const OLD_DIRECTORIES = [
  path.join(process.cwd(), '..', 'gg_old_new'),
  path.join(process.cwd(), '..', 'gg_old_newpicgg_old_securepic'),
  path.join(process.cwd(), '..', 'gg26_old_secure'),
  path.join(process.cwd(), 'public', 'newpic'),
  path.join(process.cwd(), 'public', 'securepic'),
];

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

async function findGifFile(actressId: number): Promise<{ path: string; folderName: string; fromSupabase?: boolean } | null> {
  // First, try Supabase storage (where files actually are)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Check both securepic and newpic folders in Supabase
      for (const folderName of ['securepic', 'newpic']) {
        try {
          const { data: files, error } = await supabase.storage
            .from('glamourgirls_images')
            .list(`${folderName}/${actressId}`, { limit: 100 });
          
          if (error || !files || files.length === 0) {
            continue;
          }
          
          // Look for headshot.gif/jpg first
          const headshotFile = files.find(f => 
            f.name.toLowerCase() === 'headshot.gif' || 
            f.name.toLowerCase() === 'headshot.jpg' ||
            f.name.toLowerCase() === 'headshot.jpeg'
          );
          
          if (headshotFile) {
            return {
              path: `${folderName}/${actressId}/${headshotFile.name}`,
              folderName,
              fromSupabase: true
            };
          }
          
          // If no headshot, look for second .gif file
          const gifFiles = files
            .filter(f => f.name.toLowerCase().endsWith('.gif'))
            .sort((a, b) => {
              const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
              const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
              if (numA !== numB) return numA - numB;
              return a.name.localeCompare(b.name);
            });
          
          if (gifFiles.length >= 2) {
            // Use second GIF (index 1) - first is name card, skip it
            return {
              path: `${folderName}/${actressId}/${gifFiles[1].name}`,
              folderName,
              fromSupabase: true
            };
          } else if (gifFiles.length === 1) {
            // Only one GIF exists - might be the name card, but use it as fallback
            console.warn(`  ⚠️  Only one GIF found for ${actressId}, might be name card`);
            return {
              path: `${folderName}/${actressId}/${gifFiles[0].name}`,
              folderName,
              fromSupabase: true
            };
          }
        } catch (err) {
          // Continue to next folder
          continue;
        }
      }
    } catch (err) {
      console.error(`Error checking Supabase for actress ${actressId}:`, err);
    }
  }
  
  // Fallback: Check local directories
  for (const baseDir of OLD_DIRECTORIES) {
    try {
      // Try direct actress ID folder
      const actressFolder = path.join(baseDir, actressId.toString());
      
      try {
        await fs.access(actressFolder);
        const files = await fs.readdir(actressFolder);
        
        // Look for headshot.gif first
        const headshotGif = files.find(f => 
          f.toLowerCase() === 'headshot.gif' || 
          f.toLowerCase() === 'headshot.jpg' ||
          f.toLowerCase() === 'headshot.jpeg'
        );
        
        if (headshotGif) {
          const folderName = baseDir.includes('securepic') ? 'securepic' : 
                            baseDir.includes('newpic') ? 'newpic' : 'securepic';
          return {
            path: path.join(actressFolder, headshotGif),
            folderName
          };
        }
        
        // If no headshot.gif, look for second .gif file
        const gifFiles = files
          .filter(f => f.toLowerCase().endsWith('.gif'))
          .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b);
          });
        
        if (gifFiles.length >= 2) {
          // Use second GIF (index 1) - first is name card, skip it
          const folderName = baseDir.includes('securepic') ? 'securepic' : 
                            baseDir.includes('newpic') ? 'newpic' : 'securepic';
          return {
            path: path.join(actressFolder, gifFiles[1]),
            folderName
          };
        } else if (gifFiles.length === 1) {
          // Only one GIF exists - might be the name card, but use it as fallback
          console.warn(`  ⚠️  Only one GIF found for ${actressId}, might be name card`);
          const folderName = baseDir.includes('securepic') ? 'securepic' : 
                            baseDir.includes('newpic') ? 'newpic' : 'securepic';
          return {
            path: path.join(actressFolder, gifFiles[0]),
            folderName
          };
        }
      } catch {
        // Folder doesn't exist, continue to next directory
        continue;
      }
    } catch {
      // Base directory doesn't exist, continue
      continue;
    }
  }
  
  return null;
}

async function processHeadshot(actressId: number, name: string, gifPath: string, folderName: string, dryRun: boolean, fromSupabase?: boolean): Promise<ProcessResult> {
  try {
    console.log(`\n[${actressId}] ${name}`);
    console.log(`  Source: ${gifPath}${fromSupabase ? ' (from Supabase)' : ''}`);
    
    if (dryRun) {
      return {
        actressId,
        name,
        success: true,
        message: 'DRY RUN: Would process headshot',
        skipped: true,
      };
    }

    // Read the GIF file - either from Supabase or local filesystem
    let imageBuffer: Buffer;
    if (fromSupabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return {
          actressId,
          name,
          success: false,
          message: 'Supabase credentials missing',
        };
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      const cleanPath = gifPath.startsWith('/') ? gifPath.slice(1) : gifPath;
      
      const { data, error } = await supabase.storage
        .from('glamourgirls_images')
        .download(cleanPath);
      
      if (error || !data) {
        return {
          actressId,
          name,
          success: false,
          message: `Failed to download from Supabase: ${error?.message || 'No data'}`,
        };
      }
      
      const arrayBuffer = await data.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      imageBuffer = await fs.readFile(gifPath);
    }
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return {
        actressId,
        name,
        success: false,
        message: `Invalid image dimensions`,
      };
    }

    console.log(`  Original dimensions: ${metadata.width} × ${metadata.height}`);

    // Extract first frame if animated GIF
    let processedBuffer = imageBuffer;
    if (metadata.pages && metadata.pages > 1) {
      console.log(`  Extracting first frame from animated GIF...`);
      processedBuffer = await sharp(imageBuffer, { page: 0 }).toBuffer();
      const frameMeta = await sharp(processedBuffer).metadata();
      console.log(`  Frame dimensions: ${frameMeta.width} × ${frameMeta.height}`);
    }

    // Crop: top 30px, right 30px, left 25px, bottom 25px
    const cropLeft = 25;
    const cropTop = 30;
    const cropRight = 30;
    const cropBottom = 25;

    const originalMeta = await sharp(processedBuffer).metadata();
    if (!originalMeta.width || !originalMeta.height) {
      return {
        actressId,
        name,
        success: false,
        message: `Could not read image metadata`,
      };
    }

    const cropWidth = originalMeta.width - cropLeft - cropRight;
    const cropHeight = originalMeta.height - cropTop - cropBottom;

    if (cropWidth <= 0 || cropHeight <= 0) {
      return {
        actressId,
        name,
        success: false,
        message: `Invalid crop dimensions: ${originalMeta.width}x${originalMeta.height}`,
      };
    }

    console.log(`  Cropping: left=${cropLeft}, top=${cropTop}, right=${cropRight}, bottom=${cropBottom}`);
    console.log(`  Crop dimensions: ${cropWidth} × ${cropHeight}`);

    // Crop the image
    let processedImage = sharp(processedBuffer).extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    });

    // Resize height to TARGET_HEIGHT (maintain aspect ratio)
    processedImage = processedImage.resize(null, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: false,
    });

    const resizedBuffer = await processedImage.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    const resizedWidth = resizedMeta.width || TARGET_WIDTH;
    const resizedHeight = resizedMeta.height || TARGET_HEIGHT;

    console.log(`  After height resize: ${resizedWidth} × ${resizedHeight}`);

    // Crop width to TARGET_WIDTH (centered) if needed
    if (resizedWidth > TARGET_WIDTH) {
      const cropLeftFinal = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
      processedImage = sharp(resizedBuffer).extract({
        left: cropLeftFinal,
        top: 0,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });
      console.log(`  Cropped width to ${TARGET_WIDTH}px (centered, left=${cropLeftFinal})`);
    } else if (resizedWidth < TARGET_WIDTH) {
      // If width is smaller, resize to exact dimensions (cover mode)
      processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover',
      });
      console.log(`  Resized to exact dimensions (cover mode)`);
    }

    // Convert to JPEG
    const headshotBuffer = await processedImage
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const finalMetadata = await sharp(headshotBuffer).metadata();
    console.log(`  Final dimensions: ${finalMetadata.width} × ${finalMetadata.height}`);

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        actressId,
        name,
        success: false,
        message: 'Missing Supabase credentials',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upload to Supabase
    const storagePath = `${folderName}/${actressId}/headshot.jpg`;
    await uploadToSupabase(supabase, 'glamourgirls_images', storagePath, headshotBuffer);
    console.log(`  ✓ Uploaded to Supabase: ${storagePath}`);

    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;

    // Update database
    try {
      // Delete existing headshot if it exists
      await pool.execute(
        `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
        [actressId]
      );

      // Insert new headshot into database (as thumbnail type, mytp = 3)
      await pool.execute(
        `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
         VALUES (?, ?, ?, ?, 3, ?, ?)`,
        [
          actressId,
          dbPath,
          finalMetadata.width || TARGET_WIDTH,
          finalMetadata.height || TARGET_HEIGHT,
          'image/jpeg',
          headshotBuffer.length
        ]
      );

      console.log(`  ✓ Headshot saved to database: ${dbPath}`);
      
      return {
        actressId,
        name,
        success: true,
        message: 'Headshot processed and uploaded successfully',
      };
    } catch (error: any) {
      throw error;
    }
  } catch (error: any) {
    return {
      actressId,
      name,
      success: false,
      message: error?.message || 'Unknown error',
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  console.log('Finding published actresses without headshots...\n');

  try {
    // Find all published actresses without headshots
    const [results] = await pool.execute(`
      SELECT DISTINCT g.id, g.nm as name
      FROM girls g
      WHERE g.published = 2
        AND g.id NOT IN (
          SELECT DISTINCT i.girlid
          FROM images i
          WHERE i.girlid = g.id
            AND i.path IS NOT NULL
            AND i.path != ''
            AND (
              i.path ILIKE '%headshot.jpg%'
              OR i.path ILIKE '%headshot.jpeg%'
              OR i.path ILIKE '%headshot.png%'
            )
        )
      ORDER BY g.id
      ${limit ? `LIMIT ${limit}` : ''}
    `) as any[];

    const actresses = Array.isArray(results) ? results : [];
    console.log(`Found ${actresses.length} published actresses without headshots\n`);

    if (actresses.length === 0) {
      console.log('No actresses to process.');
      return;
    }

    const processResults: ProcessResult[] = [];
    let processed = 0;
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (const actress of actresses) {
      const actressId = Number(actress.id);
      const name = String(actress.name || '');

      // Find GIF file (check Supabase first, then local directories)
      const gifFile = await findGifFile(actressId);

      if (!gifFile) {
        const result: ProcessResult = {
          actressId,
          name,
          success: false,
          message: 'No GIF file found in Supabase storage or old directories',
        };
        processResults.push(result);
        failed++;
        console.log(`[${actressId}] ${name} - ✗ No GIF file found`);
        continue;
      }

      // Process the headshot
      const result = await processHeadshot(
        actressId,
        name,
        gifFile.path,
        gifFile.folderName,
        dryRun,
        gifFile.fromSupabase
      );

      processResults.push(result);
      processed++;

      if (result.success) {
        if (result.skipped) {
          skipped++;
        } else {
          succeeded++;
        }
      } else {
        failed++;
      }

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total actresses checked: ${actresses.length}`);
    console.log(`Processed: ${processed}`);
    console.log(`Succeeded: ${succeeded}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log('='.repeat(60));

    // Show failed actresses
    const failedActresses = processResults.filter(r => !r.success && !r.skipped);
    if (failedActresses.length > 0) {
      console.log('\nFailed actresses:');
      failedActresses.forEach(r => {
        console.log(`  [${r.actressId}] ${r.name}: ${r.message}`);
      });
    }

    // Show actresses with no GIF files found
    const noGifFiles = processResults.filter(r => !r.success && r.message.includes('No GIF file'));
    if (noGifFiles.length > 0) {
      console.log(`\nActresses with no GIF files found (${noGifFiles.length}):`);
      noGifFiles.forEach(r => {
        console.log(`  [${r.actressId}] ${r.name}`);
      });
    }

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

