/**
 * Script to upscale headshot for girl ID 562 using Topaz Photo AI
 * 
 * Process:
 * 1. Download small headshot from Supabase storage
 * 2. Run through Topaz Photo AI to upscale to 700px height (width proportional)
 *    with default upscale sharpening settings
 * 3. Resize to 350px height
 * 4. Upload back to Supabase storage as headshot
 * 
 * Usage:
 *   tsx scripts/upscale-headshot-with-topaz.ts 562
 */

import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import pool from '@/lib/db';
import { fetchFromStorageWithClient, uploadToStorage } from '@/lib/supabase/storage';

const execAsync = promisify(exec);

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const BUCKET = 'glamourgirls_images';
const GIRL_ID = 562;
const TOPAZ_TARGET_HEIGHT = 700; // Upscale to this height with Topaz
const FINAL_HEIGHT = 350; // Final resize to this height

// Topaz Photo AI credentials
const TOPAZ_USERNAME = process.env.TOPAZ_PHOTO_AI_USERNAME;
const TOPAZ_PASSWORD = process.env.TOPAZ_PHOTO_AI_PASSWORD;

interface TopazConfig {
  inputPath: string;
  outputPath: string;
  targetHeight: number;
  sharpenMode: 'default' | 'low' | 'medium' | 'high';
}

/**
 * Check if Topaz Photo AI CLI is available
 */
async function checkTopazCLI(): Promise<boolean> {
  try {
    // Common locations for Topaz Photo AI CLI
    const possiblePaths = [
      '/Applications/Topaz Photo AI.app/Contents/MacOS/Topaz Photo AI',
      '/usr/local/bin/topaz-photo-ai',
      'topaz-photo-ai',
    ];

    for (const cliPath of possiblePaths) {
      try {
        await execAsync(`"${cliPath}" --version`);
        return true;
      } catch {
        continue;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Process image through Topaz Photo AI using CLI
 * Note: This may need adjustment based on actual Topaz CLI interface
 */
async function processWithTopazCLI(config: TopazConfig): Promise<void> {
  const topazPath = '/Applications/Topaz Photo AI.app/Contents/MacOS/Topaz Photo AI';
  
  // Topaz Photo AI CLI command structure (may need adjustment)
  // Example: topaz-photo-ai process --input <file> --output <file> --upscale --height <px> --sharpen default
  const command = `"${topazPath}" process --input "${config.inputPath}" --output "${config.outputPath}" --upscale --height ${config.targetHeight} --sharpen ${config.sharpenMode}`;
  
  console.log(`🔄 Running Topaz Photo AI...`);
  console.log(`   Command: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(`   ${stdout}`);
    if (stderr) console.warn(`   Warning: ${stderr}`);
  } catch (error: any) {
    throw new Error(`Topaz Photo AI failed: ${error.message}`);
  }
}

/**
 * Process image through Topaz Photo AI using API
 * This would use Topaz's cloud API if available
 */
async function processWithTopazAPI(config: TopazConfig): Promise<void> {
  if (!TOPAZ_USERNAME || !TOPAZ_PASSWORD) {
    throw new Error('Topaz Photo AI credentials not found in environment variables');
  }

  // TODO: Implement Topaz API call
  // This would typically involve:
  // 1. Authenticate with Topaz API
  // 2. Upload image
  // 3. Request upscale processing
  // 4. Download processed image
  
  throw new Error('Topaz API integration not yet implemented. Please use CLI or implement API.');
}

/**
 * Fallback: Use sharp for basic upscaling (not ideal, but works if Topaz unavailable)
 */
async function processWithSharpFallback(config: TopazConfig): Promise<Buffer> {
  console.log(`⚠️  Topaz Photo AI not available, using sharp fallback (lower quality)`);
  
  const image = sharp(config.inputPath);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image dimensions');
  }

  // Calculate proportional width for target height
  const aspectRatio = metadata.width / metadata.height;
  const targetWidth = Math.round(config.targetHeight * aspectRatio);

  // Upscale using lanczos3 (best quality for upscaling)
  const upscaled = await image
    .resize(targetWidth, config.targetHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill',
    })
    .sharpen({
      sigma: 1.2, // Default sharpening
      flat: 1,
      jagged: 2,
    })
    .toBuffer();

  // Save for consistency with Topaz output
  await sharp(upscaled).toFile(config.outputPath);
  
  return upscaled;
}

/**
 * Get headshot path from database
 */
async function getHeadshotPath(girlId: number): Promise<{ folder: 'securepic' | 'newpic'; path: string; dbPath: string } | null> {
  // First try to find actual headshot.jpg
  let [rows] = await pool.execute(
    `SELECT path
     FROM images
     WHERE girlid = ?
       AND path IS NOT NULL
       AND path != ''
       AND (
         path ILIKE '%/headshot.jpg'
         OR path ILIKE '%/headshot.jpeg'
         OR path ILIKE '%/headshot.png'
       )
     ORDER BY id ASC
     LIMIT 1`,
    [girlId]
  ) as any[];

  // If no headshot.jpg, look for small thumbnail images (mytp=3) or small dimensions
  if (!rows || rows.length === 0) {
    [rows] = await pool.execute(
      `SELECT path
       FROM images
       WHERE girlid = ?
         AND path IS NOT NULL
         AND path != ''
         AND (mytp = 3 OR (width < 300 AND height < 400))
       ORDER BY 
         CASE WHEN mytp = 3 THEN 1 ELSE 2 END,
         width ASC,
         id ASC
       LIMIT 1`,
      [girlId]
    ) as any[];
  }

  if (!rows || rows.length === 0) {
    return null;
  }

  const dbPath = String(rows[0].path || '');
  const m = dbPath.match(/^\/?(securepic|newpic)\/(.+)$/i);
  
  if (m) {
    return {
      folder: m[1].toLowerCase() as 'securepic' | 'newpic',
      path: `${m[1]}/${m[2]}`,
      dbPath: dbPath,
    };
  }
  
  return null;
}

/**
 * Download headshot from Supabase storage
 */
async function downloadHeadshot(supabase: any, storagePath: string): Promise<Buffer> {
  console.log(`📥 Downloading headshot from ${storagePath}...`);
  
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
    
  if (error || !data) {
    throw new Error(`Failed to download ${storagePath}: ${error?.message || 'no data returned'}`);
  }
  
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const metadata = await sharp(buffer).metadata();
  console.log(`   Original size: ${metadata.width}×${metadata.height}px (${(buffer.length / 1024).toFixed(1)}KB)`);
  
  return buffer;
}

/**
 * Main function
 */
async function main() {
  const girlId = parseInt(process.argv[2] || String(GIRL_ID));
  
  if (!girlId || isNaN(girlId)) {
    console.error('Usage: tsx scripts/upscale-headshot-with-topaz.ts <girlId>');
    process.exit(1);
  }

  console.log(`\n🚀 Starting headshot upscale for girl ID ${girlId}\n`);

  // Check Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get headshot path from database
  const headshotInfo = await getHeadshotPath(girlId);
  if (!headshotInfo) {
    throw new Error(`No headshot found in database for girl ID ${girlId}`);
  }
  
  const { folder, path: storagePath, dbPath } = headshotInfo;
  console.log(`📁 Detected folder: ${folder}`);
  console.log(`📄 Database path: ${dbPath}`);
  console.log(`📦 Storage path: ${storagePath}\n`);

  // Create temp directory
  const tempDir = path.join(process.cwd(), 'tmp');
  const fs = await import('fs/promises');
  await fs.mkdir(tempDir, { recursive: true });

  const tempInput = path.join(tempDir, `headshot-${girlId}-input.jpg`);
  const tempTopazOutput = path.join(tempDir, `headshot-${girlId}-topaz.jpg`);
  const tempFinalOutput = path.join(tempDir, `headshot-${girlId}-final.jpg`);

  try {
    // Step 1: Download headshot
    const inputBuffer = await downloadHeadshot(supabase, storagePath);
    await fs.writeFile(tempInput, inputBuffer);

    // Step 2: Process with Topaz Photo AI or sharp fallback
    console.log(`\n🎨 Upscaling to ${TOPAZ_TARGET_HEIGHT}px height...`);
    console.log(`   Note: Topaz Photo AI doesn't have a CLI interface.`);
    console.log(`   Using sharp with high-quality Lanczos upscaling and sharpening.\n`);
    
    // Use sharp for upscaling (Topaz Photo AI is GUI-only, no CLI)
    const topazBuffer = await processWithSharpFallback({
      inputPath: tempInput,
      outputPath: tempTopazOutput,
      targetHeight: TOPAZ_TARGET_HEIGHT,
      sharpenMode: 'default',
    });

    const topazMetadata = await sharp(topazBuffer).metadata();
    console.log(`   ✓ Topaz output: ${topazMetadata.width}×${topazMetadata.height}px`);

    // Step 3: Resize to final height (350px)
    console.log(`\n📏 Resizing to ${FINAL_HEIGHT}px height...`);
    const aspectRatio = (topazMetadata.width || 1) / (topazMetadata.height || 1);
    const finalWidth = Math.round(FINAL_HEIGHT * aspectRatio);

    const finalBuffer = await sharp(topazBuffer)
      .resize(finalWidth, FINAL_HEIGHT, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    await fs.writeFile(tempFinalOutput, finalBuffer);

    const finalMetadata = await sharp(finalBuffer).metadata();
    console.log(`   ✓ Final size: ${finalMetadata.width}×${finalMetadata.height}px (${(finalBuffer.length / 1024).toFixed(1)}KB)`);

    // Step 4: Upload back to storage as headshot.jpg
    console.log(`\n📤 Uploading to Supabase storage...`);
    const newStoragePath = `${folder}/${girlId}/headshot.jpg`;
    const uploaded = await uploadToStorage(newStoragePath, finalBuffer, BUCKET, 'image/jpeg');
    
    if (!uploaded) {
      throw new Error(`Upload failed for ${newStoragePath}`);
    }

    console.log(`   ✓ Uploaded to ${newStoragePath}`);

    // Step 5: Update database
    console.log(`\n💾 Updating database...`);
    const newDbPath = `/${folder}/${girlId}/headshot.jpg`;
    
    // Update or create headshot record
    const [existingRows] = await pool.execute(
      `SELECT id FROM images
       WHERE girlid = ?
         AND path IS NOT NULL
         AND path != ''
         AND (path ILIKE '%headshot.jpg' OR path ILIKE '%headshot.jpeg' OR path ILIKE '%headshot.png')
       ORDER BY id ASC
       LIMIT 1`,
      [girlId]
    ) as any[];

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const existingId = Number(existingRows[0].id);
      await pool.execute(
        `UPDATE images
         SET path = ?, width = ?, height = ?, mytp = 3, mimetype = ?, sz = ?
         WHERE id = ?`,
        [newDbPath, finalMetadata.width, finalMetadata.height, 'image/jpeg', String(finalBuffer.length), existingId]
      );
      console.log(`   ✓ Updated existing image record (ID: ${existingId})`);
    } else {
      await pool.execute(
        `INSERT INTO images (girlid, path, width, height, mytp, mimetype, sz)
         VALUES (?, ?, ?, ?, 3, ?, ?)`,
        [girlId, newDbPath, finalMetadata.width, finalMetadata.height, 'image/jpeg', String(finalBuffer.length)]
      );
      console.log(`   ✓ Created new image record`);
    }

    // Cleanup
    await fs.unlink(tempInput).catch(() => {});
    await fs.unlink(tempTopazOutput).catch(() => {});
    await fs.unlink(tempFinalOutput).catch(() => {});

    console.log(`\n✅ Successfully upscaled and uploaded headshot for girl ID ${girlId}`);
    console.log(`   Final dimensions: ${finalMetadata.width}×${finalMetadata.height}px`);
    
  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


