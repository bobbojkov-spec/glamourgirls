import 'dotenv/config';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import pool from '../src/lib/db';
import { createCanvas } from 'canvas';

const GALLERY_MAX_SIZE = 900; // Gallery images max 900px on longer side

// Helper function to create watermark using canvas with fixed width
async function createWatermarkCanvas(text: string, imageWidth: number, imageHeight: number): Promise<Buffer> {
  const targetTextWidth = 475; // Target width between 450-500px
  const canvas = createCanvas(imageWidth, imageHeight);
  const ctx = canvas.getContext('2d');
  
  // Find the right font size to achieve target text width
  let fontSize = 24; // Start with a reasonable size
  let textWidth = 0;
  let iterations = 0;
  const maxIterations = 20;
  
  // Binary search to find font size that gives us ~475px width
  let minSize = 12;
  let maxSize = 72;
  
  while (iterations < maxIterations) {
    fontSize = Math.floor((minSize + maxSize) / 2);
    ctx.font = `${fontSize}px "Brush Script MT", "Brush Script", "Lucida Handwriting", cursive`;
    const metrics = ctx.measureText(text);
    textWidth = metrics.width;
    
    if (Math.abs(textWidth - targetTextWidth) < 5) {
      break; // Close enough
    }
    
    if (textWidth < targetTextWidth) {
      minSize = fontSize + 1;
    } else {
      maxSize = fontSize - 1;
    }
    
    iterations++;
  }
  
  // Set final font
  ctx.font = `${fontSize}px "Brush Script MT", "Brush Script", "Lucida Handwriting", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  
  // Set text color with transparency (80-90% opacity for better readability)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'; // Darker shadow for better contrast
  ctx.lineWidth = 0.8;
  
  // Draw text with stroke for better visibility
  const x = imageWidth / 2;
  const y = imageHeight - 15;
  
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  
  return canvas.toBuffer('image/png');
}

async function rebuildGalleryImages() {
  try {
    console.log('Starting gallery image rebuild process...\n');

    // Get all HQ images (mytp = 5) that are > 1500px on longer side
    const [hqImages] = await pool.execute(`
      SELECT i.id, i.girlid, i.path, i.width, i.height, g.nm as actressName
      FROM images i
      JOIN girls g ON i.girlid = g.id
      WHERE i.mytp = 5
      AND (i.width > 1500 OR i.height > 1500)
      ORDER BY i.girlid, i.id
    `) as any[];

    console.log(`Found ${hqImages.length} HQ images to process\n`);

    let processed = 0;
    let regenerated = 0;
    let skipped = 0;
    let errors = 0;

    for (const hqImage of hqImages) {
      try {
        processed++;
        const hqId = hqImage.id;
        const actressId = hqImage.girlid;
        const hqPath = hqImage.path;
        const hqWidth = hqImage.width;
        const hqHeight = hqImage.height;
        const longerSide = Math.max(hqWidth, hqHeight);

        console.log(`[${processed}/${hqImages.length}] Processing HQ image ${hqId} (${hqWidth}x${hqHeight}) for actress ${actressId} (${hqImage.actressName})`);

        // Find corresponding gallery image (mytp = 4) - usually has ID = hqId + 1 or hqId - 1
        const [galleryImages] = await pool.execute(`
          SELECT id, path, width, height
          FROM images
          WHERE girlid = ? AND mytp = 4
          AND (id = ? + 1 OR id = ? - 1 OR id = ?)
          LIMIT 1
        `, [actressId, hqId, hqId, hqId]) as any[];

        if (galleryImages.length === 0) {
          console.log(`  → No gallery image found, skipping...`);
          skipped++;
          continue;
        }

        const galleryImage = galleryImages[0];
        const currentGalleryWidth = galleryImage.width;
        const currentGalleryHeight = galleryImage.height;
        const currentLongerSide = Math.max(currentGalleryWidth, currentGalleryHeight);

        // Always regenerate from HQ to ensure watermark and correct size
        console.log(`  → Regenerating gallery image (current: ${currentLongerSide}px, target: ${GALLERY_MAX_SIZE}px)...`);

        // Construct full path to HQ image
        const cleanHqPath = hqPath.startsWith('/') ? hqPath.slice(1) : hqPath;
        const hqFullPath = path.join(process.cwd(), 'public', cleanHqPath);

        // Check if HQ file exists
        try {
          await fs.access(hqFullPath);
        } catch {
          console.log(`  → HQ file not found: ${hqFullPath}, skipping...`);
          skipped++;
          continue;
        }

        // Read HQ image
        const hqBuffer = await fs.readFile(hqFullPath);

        // Resize to gallery size (900px max on longer side)
        const resizedImage = sharp(hqBuffer)
          .resize(GALLERY_MAX_SIZE, GALLERY_MAX_SIZE, {
            fit: 'inside',
            withoutEnlargement: true,
          });

        // Get resized dimensions
        const resizedBuffer = await resizedImage.toBuffer();
        const resizedMeta = await sharp(resizedBuffer).metadata();
        const resizedWidth = resizedMeta.width || GALLERY_MAX_SIZE;
        const resizedHeight = resizedMeta.height || GALLERY_MAX_SIZE;

        // Create watermark
        const watermarkText = 'www.GlamourGirlsOftheSilverScreen.com';
        const watermarkBuffer = await createWatermarkCanvas(watermarkText, resizedWidth, resizedHeight);

        // Composite watermark onto resized image
        const galleryBuffer = await sharp(resizedBuffer)
          .composite([{
            input: watermarkBuffer,
            gravity: 'south', // Position at the bottom
          }])
          .jpeg({ quality: 85 })
          .toBuffer();

        // Get gallery image path
        const cleanGalleryPath = galleryImage.path.startsWith('/') ? galleryImage.path.slice(1) : galleryImage.path;
        const galleryFullPath = path.join(process.cwd(), 'public', cleanGalleryPath);

        // Ensure directory exists
        const galleryDir = path.dirname(galleryFullPath);
        await fs.mkdir(galleryDir, { recursive: true });

        // Write new gallery image
        await fs.writeFile(galleryFullPath, galleryBuffer);

        // Get final dimensions
        const finalMeta = await sharp(galleryBuffer).metadata();
        const finalWidth = finalMeta.width || resizedWidth;
        const finalHeight = finalMeta.height || resizedHeight;

        // Update database with new dimensions
        await pool.execute(
          `UPDATE images SET width = ?, height = ? WHERE id = ?`,
          [finalWidth, finalHeight, galleryImage.id]
        );

        console.log(`  ✓ Regenerated gallery image: ${finalWidth}x${finalHeight}px`);
        regenerated++;

      } catch (error: any) {
        console.error(`  ✗ Error processing HQ image ${hqImage.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total HQ images processed: ${processed}`);
    console.log(`Gallery images regenerated: ${regenerated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    // Close the pool connection
    await pool.end();
    process.exit(0);
  }
}

// Run the script
rebuildGalleryImages();

