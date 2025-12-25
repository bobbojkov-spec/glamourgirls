/**
 * Script to reimport headshots from Supabase storage folders (newpic/securepic)
 * 
 * This script:
 * 1. Scans Supabase storage for headshot.jpg files OR second GIF files in newpic and securepic folders
 * 2. Checks if they're already in the database
 * 3. If missing headshot.jpg, uses the second GIF file (skips first GIF which is name card)
 * 4. Processes and adds to the database
 * 
 * Usage: tsx scripts/reimport-headshots-from-supabase.ts [--limit N] [--only-existing]
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import pool from '@/lib/db';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

interface ProcessResult {
  actressId: number;
  folderName: string;
  success: boolean;
  message: string;
  skipped?: boolean;
}

async function processHeadshot(actressId: number, folderName: string, supabase: any, onlyExisting: boolean = false): Promise<ProcessResult> {
  try {
    // Check if already in database
    const [existing] = await pool.execute(
      `SELECT id FROM images 
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

    if (Array.isArray(existing) && existing.length > 0) {
      return {
        actressId,
        folderName,
        success: true,
        message: 'Already in database',
        skipped: true,
      };
    }

    // First, try to download existing headshot.jpg
    let storagePath = `${folderName}/${actressId}/headshot.jpg`;
    let { data, error } = await supabase.storage
      .from('glamourgirls_images')
      .download(storagePath);

    let imageBuffer: Buffer | null = null;
    let sourceFile = 'headshot.jpg';
    let needsProcessing = false;

    // If headshot.jpg doesn't exist, look for second GIF file (skip first which is name card)
    if (error || !data) {
      if (onlyExisting) {
        return {
          actressId,
          folderName,
          success: false,
          message: 'headshot.jpg not found (use without --only-existing to process GIFs)',
        };
      }

      // List all files in the folder
      const { data: files, error: listError } = await supabase.storage
        .from('glamourgirls_images')
        .list(`${folderName}/${actressId}`, { limit: 100 });

      if (listError || !files) {
        return {
          actressId,
          folderName,
          success: false,
          message: `Cannot list files: ${listError?.message || 'No files'}`,
        };
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
        return {
          actressId,
          folderName,
          success: false,
          message: `Need at least 2 GIF files (found ${gifFiles.length}), first is name card`,
        };
      }

      // Use second GIF (index 1) - skip first which is name card
      const secondGif = gifFiles[1];
      storagePath = `${folderName}/${actressId}/${secondGif.name}`;
      sourceFile = secondGif.name;
      needsProcessing = true;

      const downloadResult = await supabase.storage
        .from('glamourgirls_images')
        .download(storagePath);

      if (downloadResult.error || !downloadResult.data) {
        return {
          actressId,
          folderName,
          success: false,
          message: `Cannot download second GIF: ${downloadResult.error?.message || 'No data'}`,
        };
      }

      data = downloadResult.data;
    }

    // Convert to buffer
    const arrayBuffer = await data.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);

    let finalBuffer = imageBuffer;
    let finalMetadata = await sharp(imageBuffer).metadata();

    // If processing from GIF, extract first frame and process it
    if (needsProcessing) {
      // Extract first frame if animated GIF
      if (finalMetadata.pages && finalMetadata.pages > 1) {
        finalBuffer = await sharp(imageBuffer, { page: 0 }).toBuffer();
        finalMetadata = await sharp(finalBuffer).metadata();
      }

      // Process GIF: crop and resize to headshot dimensions (190×245px)
      const TARGET_WIDTH = 190;
      const TARGET_HEIGHT = 245;
      
      // Crop: top 30px, right 30px, left 25px, bottom 25px
      const cropLeft = 25;
      const cropTop = 30;
      const cropRight = 30;
      const cropBottom = 25;

      if (!finalMetadata.width || !finalMetadata.height) {
        return {
          actressId,
          folderName,
          success: false,
          message: 'Invalid image dimensions',
        };
      }

      const cropWidth = finalMetadata.width - cropLeft - cropRight;
      const cropHeight = finalMetadata.height - cropTop - cropBottom;

      if (cropWidth <= 0 || cropHeight <= 0) {
        return {
          actressId,
          folderName,
          success: false,
          message: `Invalid crop dimensions: ${finalMetadata.width}x${finalMetadata.height}`,
        };
      }

      // Crop the image
      let processedImage = sharp(finalBuffer).extract({
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

      // Crop width to TARGET_WIDTH (centered) if needed
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
      finalBuffer = await processedImage
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      
      finalMetadata = await sharp(finalBuffer).metadata();
    }

    if (!finalMetadata.width || !finalMetadata.height) {
      return {
        actressId,
        folderName,
        success: false,
        message: 'Invalid final image dimensions',
      };
    }

    // Upload processed headshot to Supabase (as headshot.jpg)
    const headshotStoragePath = `${folderName}/${actressId}/headshot.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('glamourgirls_images')
      .upload(headshotStoragePath, finalBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return {
        actressId,
        folderName,
        success: false,
        message: `Upload error: ${uploadError.message}`,
      };
    }

    // Insert into database
    const dbPath = `/${folderName}/${actressId}/headshot.jpg`;
    
    // Delete any existing headshot entries for this actress
    await pool.execute(
      `DELETE FROM images WHERE girlid = ? AND path ILIKE '%headshot%'`,
      [actressId]
    );

    // Insert new headshot (mytp = 3 for thumbnails)
    await pool.execute(
      `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz) 
       VALUES (?, ?, ?, ?, 3, ?, ?)`,
      [
        actressId,
        dbPath,
        finalMetadata.width,
        finalMetadata.height,
        'image/jpeg',
        finalBuffer.length
      ]
    );

    return {
      actressId,
      folderName,
      success: true,
      message: `${needsProcessing ? `Processed from ${sourceFile}, ` : ''}Added: ${finalMetadata.width}×${finalMetadata.height}px`,
    };
  } catch (error: any) {
    return {
      actressId,
      folderName,
      success: false,
      message: error?.message || 'Unknown error',
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const onlyExisting = args.includes('--only-existing');

  console.log('🔍 Scanning Supabase storage for headshots...\n');
  if (onlyExisting) {
    console.log('⚠️  Only processing existing headshot.jpg files (skipping GIF processing)\n');
  } else {
    console.log('📝 Will process second GIF file if headshot.jpg not found (skipping first GIF which is name card)\n');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const headshots: Array<{ actressId: number; folderName: string }> = [];

    // Scan securepic folder
    console.log('Scanning securepic folder...');
    let securepicFolders: any[] = [];
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase.storage
        .from('glamourgirls_images')
        .list('securepic', {
          limit: pageSize,
          offset: offset,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error('Error listing securepic:', error);
        break;
      }

      if (!data || data.length === 0) break;

      securepicFolders = securepicFolders.concat(data);
      offset += pageSize;

      if (data.length < pageSize) break;
    }

    console.log(`Found ${securepicFolders.length} folders in securepic`);

    // Check each folder for headshot.jpg
    for (const folder of securepicFolders) {
      if (!folder.name || isNaN(parseInt(folder.name))) continue;

      const actressId = parseInt(folder.name);
      const { data: files } = await supabase.storage
        .from('glamourgirls_images')
        .list(`securepic/${actressId}`, { limit: 100 });

      if (files && files.some(f => f.name.toLowerCase() === 'headshot.jpg')) {
        headshots.push({ actressId, folderName: 'securepic' });
      }
    }

    // Scan newpic folder
    console.log('Scanning newpic folder...');
    let newpicFolders: any[] = [];
    offset = 0;

    while (true) {
      const { data, error } = await supabase.storage
        .from('glamourgirls_images')
        .list('newpic', {
          limit: pageSize,
          offset: offset,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error('Error listing newpic:', error);
        break;
      }

      if (!data || data.length === 0) break;

      newpicFolders = newpicFolders.concat(data);
      offset += pageSize;

      if (data.length < pageSize) break;
    }

    console.log(`Found ${newpicFolders.length} folders in newpic`);

    // Check each folder for headshot.jpg (skip if already found in securepic)
    for (const folder of newpicFolders) {
      if (!folder.name || isNaN(parseInt(folder.name))) continue;

      const actressId = parseInt(folder.name);
      
      // Skip if already found in securepic
      if (headshots.find(h => h.actressId === actressId)) continue;

      const { data: files } = await supabase.storage
        .from('glamourgirls_images')
        .list(`newpic/${actressId}`, { limit: 100 });

      if (files && files.some(f => f.name.toLowerCase() === 'headshot.jpg')) {
        headshots.push({ actressId, folderName: 'newpic' });
      }
    }

    console.log(`\nFound ${headshots.length} headshots in Supabase storage\n`);

    if (headshots.length === 0) {
      console.log('No headshots found to import.');
      return;
    }

    // Apply limit if specified
    const headshotsToProcess = limit ? headshots.slice(0, limit) : headshots;
    console.log(`Processing ${headshotsToProcess.length} headshots...\n`);

    const results: ProcessResult[] = [];
    let processed = 0;
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (const { actressId, folderName } of headshotsToProcess) {
      processed++;
      const result = await processHeadshot(actressId, folderName, supabase, onlyExisting);
      results.push(result);

      if (result.success) {
        if (result.skipped) {
          skipped++;
          if (processed % 50 === 0) {
            console.log(`[${processed}/${headshotsToProcess.length}] [${actressId}] ${folderName}: ${result.message}`);
          }
        } else {
          succeeded++;
          console.log(`✓ [${processed}/${headshotsToProcess.length}] [${actressId}] ${folderName}: ${result.message}`);
        }
      } else {
        failed++;
        console.log(`✗ [${processed}/${headshotsToProcess.length}] [${actressId}] ${folderName}: ${result.message}`);
      }

      // Small delay to avoid overwhelming the database
      if (processed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total headshots found: ${headshots.length}`);
    console.log(`Processed: ${processed}`);
    console.log(`✓ Added to database: ${succeeded}`);
    console.log(`⊘ Already in database: ${skipped}`);
    console.log(`✗ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed entries:');
      results
        .filter(r => !r.success)
        .slice(0, 20)
        .forEach(r => console.log(`  - [${r.actressId}] ${r.folderName}: ${r.message}`));
      if (failed > 20) {
        console.log(`  ... and ${failed - 20} more`);
      }
    }

  } catch (error: any) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

