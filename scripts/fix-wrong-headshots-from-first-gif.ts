/**
 * Script to fix wrong headshots that were created from the first GIF (name card)
 * 
 * This script:
 * 1. Finds actresses with headshots in database
 * 2. Checks if they have a second GIF available
 * 3. If second GIF exists: reprocess from second GIF (correct headshot)
 * 4. If no second GIF: delete wrong headshot and create placeholder
 * 
 * Usage: tsx scripts/fix-wrong-headshots-from-first-gif.ts [--dry-run] [--limit N]
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs/promises';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface ProcessResult {
  actressId: number;
  name: string;
  success: boolean;
  message: string;
  action: 'reprocessed' | 'deleted' | 'skipped';
}

const TARGET_WIDTH = 190;
const TARGET_HEIGHT = 245;

async function createPlaceholderHeadshot(actressId: number, folderName: string, supabase: any): Promise<boolean> {
  try {
    // Create a simple placeholder image (gray with "No Image" text)
    const placeholder = sharp({
      create: {
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }
      }
    });

    const placeholderBuffer = await placeholder
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload placeholder to Supabase
    const storagePath = `${folderName}/${actressId}/headshot.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('glamourgirls_images')
      .upload(storagePath, placeholderBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error(`  Upload error: ${uploadError.message}`);
      return false;
    }

    // Update database
    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;
    await pool.execute(
      `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
      [actressId]
    );

    await pool.execute(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
       VALUES (?, ?, ?, ?, 3, ?, ?)`,
      [
        actressId,
        dbPath,
        TARGET_WIDTH,
        TARGET_HEIGHT,
        'image/jpeg',
        placeholderBuffer.length
      ]
    );

    return true;
  } catch (error: any) {
    console.error(`  Error creating placeholder: ${error.message}`);
    return false;
  }
}

async function processActress(actressId: number, name: string, supabase: any, dryRun: boolean): Promise<ProcessResult> {
  try {
    // Get actress info to check if it's "Their Man"
    const [actressInfo] = await pool.execute(
      `SELECT id, nm as name, theirman FROM girls WHERE id = ?`,
      [actressId]
    ) as any[];
    
    const isTheirMan = Array.isArray(actressInfo) && actressInfo.length > 0 && 
                      (actressInfo[0].theirman === true || actressInfo[0].theirman === 1);

    // Check if actress has headshot in database
    const [headshotResults] = await pool.execute(
      `SELECT path FROM images 
       WHERE girlid = ? 
         AND path IS NOT NULL 
         AND path != ''
         AND (
           path ILIKE '%headshot.jpg%' 
           OR path ILIKE '%headshot.jpeg%'
           OR path ILIKE '%headshot.png%'
           OR mytp = 3
         )
       LIMIT 1`,
      [actressId]
    ) as any[];

    if (!Array.isArray(headshotResults) || headshotResults.length === 0) {
      return {
        actressId,
        name,
        success: true,
        message: 'No headshot in database, skipping',
        action: 'skipped',
      };
    }

    // Check both securepic and newpic for second GIF
    for (const folderName of ['securepic', 'newpic']) {
      const { data: files, error } = await supabase.storage
        .from('glamourgirls_images')
        .list(`${folderName}/${actressId}`, { limit: 100 });

      if (error || !files || files.length === 0) {
        continue;
      }

      // Filter and sort GIF files
      const gifFiles = files
        .filter(f => f.name.toLowerCase().endsWith('.gif'))
        .sort((a, b) => {
          const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
          const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
          if (numA !== numB) return numA - numB;
          return a.name.localeCompare(b.name);
        });

      if (gifFiles.length < 2) {
        // No second GIF - delete wrong headshot
        // Only create placeholder for "Their Man" entries
        if (dryRun) {
          return {
            actressId,
            name,
            success: true,
            message: `DRY RUN: Would delete wrong headshot${isTheirMan ? ' and create placeholder' : ''} (only ${gifFiles.length} GIF found)`,
            action: 'deleted',
          };
        }

        // Delete from Supabase
        const headshotPath = `${folderName}/${actressId}/headshot.jpg`;
        await supabase.storage
          .from('glamourgirls_images')
          .remove([headshotPath]);

        // Delete from local old folder if exists
        const oldSecurepicPath = `/Users/borislavbojkov/dev/gg_old_securepic/${actressId}/headshot.jpg`;
        const oldNewpicPath = `/Users/borislavbojkov/dev/gg_old_newpic/${actressId}/headshot.jpg`;
        
        try {
          await fs.unlink(oldSecurepicPath);
          console.log(`  Deleted: ${oldSecurepicPath}`);
        } catch {
          // File doesn't exist, that's okay
        }
        
        try {
          await fs.unlink(oldNewpicPath);
          console.log(`  Deleted: ${oldNewpicPath}`);
        } catch {
          // File doesn't exist, that's okay
        }

        // Delete from database
        await pool.execute(
          `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
          [actressId]
        );

        // Only create placeholder for "Their Man" entries
        if (isTheirMan) {
          const placeholderCreated = await createPlaceholderHeadshot(actressId, folderName, supabase);
          
          if (placeholderCreated) {
            return {
              actressId,
              name,
              success: true,
              message: `Deleted wrong headshot, created placeholder (Their Man, no second GIF)`,
              action: 'deleted',
            };
          } else {
            return {
              actressId,
              name,
              success: false,
              message: `Deleted wrong headshot but failed to create placeholder`,
              action: 'deleted',
            };
          }
        } else {
          // Regular actress - just delete, no placeholder
          return {
            actressId,
            name,
            success: true,
            message: `Deleted wrong headshot (no second GIF, no placeholder for regular actresses)`,
            action: 'deleted',
          };
        }
      }

      // Has second GIF - reprocess from second GIF
      if (dryRun) {
        return {
          actressId,
          name,
          success: true,
          message: `DRY RUN: Would reprocess from second GIF: ${gifFiles[1].name}`,
          action: 'reprocessed',
        };
      }

      // Download second GIF
      const secondGif = gifFiles[1];
      const storagePath = `${folderName}/${actressId}/${secondGif.name}`;
      
      const { data, error: downloadError } = await supabase.storage
        .from('glamourgirls_images')
        .download(storagePath);

      if (downloadError || !data) {
        continue; // Try next folder
      }

      // Convert to buffer
      const arrayBuffer = await data.arrayBuffer();
      let imageBuffer = Buffer.from(arrayBuffer);
      let metadata = await sharp(imageBuffer).metadata();

      // Extract first frame if animated
      if (metadata.pages && metadata.pages > 1) {
        imageBuffer = await sharp(imageBuffer, { page: 0 }).toBuffer();
        metadata = await sharp(imageBuffer).metadata();
      }

      // Process: crop and resize
      const cropLeft = 25;
      const cropTop = 30;
      const cropRight = 30;
      const cropBottom = 25;

      if (!metadata.width || !metadata.height) {
        continue;
      }

      const cropWidth = metadata.width - cropLeft - cropRight;
      const cropHeight = metadata.height - cropTop - cropBottom;

      if (cropWidth <= 0 || cropHeight <= 0) {
        continue;
      }

      // Crop
      let processedImage = sharp(imageBuffer).extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight,
      });

      // Resize height
      processedImage = processedImage.resize(null, TARGET_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: false,
      });

      const resizedBuffer = await processedImage.toBuffer();
      const resizedMeta = await sharp(resizedBuffer).metadata();
      const resizedWidth = resizedMeta.width || TARGET_WIDTH;

      // Crop width if needed
      if (resizedWidth > TARGET_WIDTH) {
        const cropLeftFinal = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
        processedImage = sharp(resizedBuffer).extract({
          left: cropLeftFinal,
          top: 0,
          width: TARGET_WIDTH,
          height: TARGET_HEIGHT,
        });
      } else if (resizedWidth < TARGET_WIDTH) {
        processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
          fit: 'cover',
        });
      }

      // Convert to JPEG
      const headshotBuffer = await processedImage
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      
      const finalMetadata = await sharp(headshotBuffer).metadata();

      // Delete old wrong headshot from Supabase
      const oldHeadshotPath = `${folderName}/${actressId}/headshot.jpg`;
      await supabase.storage
        .from('glamourgirls_images')
        .remove([oldHeadshotPath]);

      // Delete from local old folders
      const oldSecurepicPath = `/Users/borislavbojkov/dev/gg_old_securepic/${actressId}/headshot.jpg`;
      const oldNewpicPath = `/Users/borislavbojkov/dev/gg_old_newpic/${actressId}/headshot.jpg`;
      
      try {
        await fs.unlink(oldSecurepicPath);
      } catch {}
      
      try {
        await fs.unlink(oldNewpicPath);
      } catch {}

      // Upload new correct headshot
      const { error: uploadError } = await supabase.storage
        .from('glamourgirls_images')
        .upload(oldHeadshotPath, headshotBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        return {
          actressId,
          name,
          success: false,
          message: `Upload error: ${uploadError.message}`,
          action: 'reprocessed',
        };
      }

      // Update database
      const dbPath = `/${folderName}/${actressId}/headshot.jpg`;
      await pool.execute(
        `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
        [actressId]
      );

      await pool.execute(
        `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
         VALUES (?, ?, ?, ?, 3, ?, ?)`,
        [
          actressId,
          dbPath,
          finalMetadata.width,
          finalMetadata.height,
          'image/jpeg',
          headshotBuffer.length
        ]
      );

      return {
        actressId,
        name,
        success: true,
        message: `Reprocessed from second GIF (${secondGif.name}): ${finalMetadata.width}×${finalMetadata.height}px`,
        action: 'reprocessed',
      };
    }

    // No second GIF found in either folder
    // Try to determine folder from existing path
    const existingPath = headshotResults[0].path;
    const folderMatch = existingPath.match(/\/(securepic|newpic)\//);
    const folderName = folderMatch ? folderMatch[1] : 'securepic';

    if (dryRun) {
      return {
        actressId,
        name,
        success: true,
        message: `DRY RUN: Would delete wrong headshot${isTheirMan ? ' and create placeholder' : ''} (no second GIF found)`,
        action: 'deleted',
      };
    }

    // Delete wrong headshot
    const headshotPath = `${folderName}/${actressId}/headshot.jpg`;
    await supabase.storage
      .from('glamourgirls_images')
      .remove([headshotPath]);

    // Delete from local old folders
    const oldSecurepicPath = `/Users/borislavbojkov/dev/gg_old_securepic/${actressId}/headshot.jpg`;
    const oldNewpicPath = `/Users/borislavbojkov/dev/gg_old_newpic/${actressId}/headshot.jpg`;
    
    try {
      await fs.unlink(oldSecurepicPath);
      console.log(`  Deleted: ${oldSecurepicPath}`);
    } catch {
      // File doesn't exist, that's okay
    }
    
    try {
      await fs.unlink(oldNewpicPath);
      console.log(`  Deleted: ${oldNewpicPath}`);
    } catch {
      // File doesn't exist, that's okay
    }

    await pool.execute(
      `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
      [actressId]
    );

    // Only create placeholder for "Their Man" entries
    if (isTheirMan) {
      const placeholderCreated = await createPlaceholderHeadshot(actressId, folderName, supabase);
      
      return {
        actressId,
        name,
        success: placeholderCreated,
        message: placeholderCreated 
          ? `Deleted wrong headshot, created placeholder (Their Man, no second GIF)` 
          : `Deleted wrong headshot but failed to create placeholder`,
        action: 'deleted',
      };
    } else {
      // Regular actress - just delete, no placeholder
      return {
        actressId,
        name,
        success: true,
        message: `Deleted wrong headshot (no second GIF, no placeholder for regular actresses)`,
        action: 'deleted',
      };
    }
  } catch (error: any) {
    return {
      actressId,
      name,
      success: false,
      message: error?.message || 'Unknown error',
      action: 'skipped',
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

  console.log('Finding actresses with headshots to check...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all actresses with headshots
    const [results] = await pool.execute(`
      SELECT DISTINCT g.id, g.nm as name
      FROM girls g
      INNER JOIN images i ON i.girlid = g.id
      WHERE g.published = 2
        AND (g.theirman IS NULL OR g.theirman = false)
        AND i.path IS NOT NULL 
        AND i.path != ''
        AND (
          i.path ILIKE '%headshot.jpg%' 
          OR i.path ILIKE '%headshot.jpeg%'
          OR i.path ILIKE '%headshot.png%'
          OR i.mytp = 3
        )
      ORDER BY g.id
      ${limit ? `LIMIT ${limit}` : ''}
    `) as any[];

    const actresses = Array.isArray(results) ? results : [];
    console.log(`Found ${actresses.length} actresses with headshots to check\n`);

    if (actresses.length === 0) {
      console.log('No actresses to process.');
      return;
    }

    const results_list: ProcessResult[] = [];
    let processed = 0;
    let reprocessed = 0;
    let deleted = 0;
    let skipped = 0;
    let failed = 0;

    for (const actress of actresses) {
      const actressId = Number(actress.id);
      const name = String(actress.name || '');

      processed++;
      const result = await processActress(actressId, name, supabase, dryRun);
      results_list.push(result);

      if (result.success) {
        if (result.action === 'reprocessed') {
          reprocessed++;
          console.log(`✓ [${processed}/${actresses.length}] [${actressId}] ${name}: ${result.message}`);
        } else if (result.action === 'deleted') {
          deleted++;
          console.log(`✓ [${processed}/${actresses.length}] [${actressId}] ${name}: ${result.message}`);
        } else {
          skipped++;
          if (processed % 50 === 0) {
            console.log(`[${processed}/${actresses.length}] [${actressId}] ${name}: ${result.message}`);
          }
        }
      } else {
        failed++;
        console.log(`✗ [${processed}/${actresses.length}] [${actressId}] ${name}: ${result.message}`);
      }

      // Small delay
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total checked: ${actresses.length}`);
    console.log(`✓ Reprocessed from second GIF: ${reprocessed}`);
    console.log(`✓ Deleted wrong headshot (created placeholder): ${deleted}`);
    console.log(`⊘ Skipped: ${skipped}`);
    console.log(`✗ Failed: ${failed}`);

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

