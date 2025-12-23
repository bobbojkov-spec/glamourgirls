import pool from '../src/lib/db';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const TARGET_HEIGHT = 250;
const BATCH_SIZE = 10; // Process 10 actresses at a time

async function rebuildThumbnailsForActress(actressId: number): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let rebuiltCount = 0;

  try {
    // Get all gallery images (mytp = 4) for this actress
    const [galleryImages] = await pool.execute(
      `SELECT id, path, width, height, thumbid 
       FROM images 
       WHERE girlid = ? AND mytp = 4 AND path IS NOT NULL AND path != ''`,
      [actressId]
    ) as any[];

    if (!Array.isArray(galleryImages) || galleryImages.length === 0) {
      return { success: true, count: 0, errors: [] };
    }

    const publicDir = path.resolve(process.cwd(), 'public');

    for (const galleryImg of galleryImages) {
      try {
        // Get the full path to the gallery image
        const galleryPath = galleryImg.path.startsWith('/') 
          ? galleryImg.path.slice(1) 
          : galleryImg.path;
        const fullGalleryPath = path.resolve(publicDir, galleryPath);

        // Check if gallery image exists
        try {
          await fs.access(fullGalleryPath);
        } catch {
          errors.push(`Gallery image not found: ${galleryPath}`);
          continue;
        }

        // Read the gallery image
        const galleryBuffer = await fs.readFile(fullGalleryPath);
        
        // Get image metadata
        const metadata = await sharp(galleryBuffer).metadata();
        const originalWidth = metadata.width || galleryImg.width || 0;
        const originalHeight = metadata.height || galleryImg.height || 0;

        // Calculate thumbnail dimensions (250px height, maintain aspect ratio)
        const aspectRatio = originalWidth / originalHeight;
        const targetWidth = Math.round(TARGET_HEIGHT * aspectRatio);

        // Generate thumbnail with high quality settings
        const thumbnailBuffer = await sharp(galleryBuffer)
          .resize(targetWidth, TARGET_HEIGHT, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
          })
          .sharpen()
          .jpeg({ 
            quality: 95,
            mozjpeg: true,
            progressive: true,
          })
          .toBuffer();

        // Get thumbnail metadata
        const thumbMetadata = await sharp(thumbnailBuffer).metadata();

        // Determine thumbnail file path
        let thumbPath: string;
        let thumbFileName: string;

        if (galleryImg.thumbid) {
          // Get existing thumbnail path
          const [existingThumb] = await pool.execute(
            `SELECT path FROM images WHERE id = ?`,
            [galleryImg.thumbid]
          ) as any[];

          if (Array.isArray(existingThumb) && existingThumb.length > 0) {
            thumbPath = existingThumb[0].path;
            const pathParts = path.parse(thumbPath);
            thumbFileName = pathParts.base;
          } else {
            // Create new thumbnail path
            const galleryPathParts = path.parse(galleryPath);
            thumbFileName = `thumb_${path.basename(galleryPathParts.dir)}_${galleryImg.id}.jpg`;
            thumbPath = path.join(path.dirname(galleryPath), thumbFileName);
          }
        } else {
          // Create new thumbnail path
          const galleryPathParts = path.parse(galleryPath);
          thumbFileName = `thumb_${path.basename(galleryPathParts.dir)}_${galleryImg.id}.jpg`;
          thumbPath = path.join(path.dirname(galleryPath), thumbFileName);
        }

        // Ensure thumbPath starts with /
        if (!thumbPath.startsWith('/')) {
          thumbPath = '/' + thumbPath;
        }

        // Save thumbnail file
        const fullThumbPath = path.resolve(publicDir, thumbPath.startsWith('/') ? thumbPath.slice(1) : thumbPath);
        await fs.mkdir(path.dirname(fullThumbPath), { recursive: true });
        await fs.writeFile(fullThumbPath, thumbnailBuffer);

        // Update or insert thumbnail in database
        if (galleryImg.thumbid) {
          // Update existing thumbnail
          await pool.execute(
            `UPDATE images 
             SET path = ?, width = ?, height = ?, sz = 'jpg', mimetype = 'image/jpeg'
             WHERE id = ?`,
            [
              thumbPath,
              thumbMetadata.width || targetWidth,
              thumbMetadata.height || TARGET_HEIGHT,
              galleryImg.thumbid
            ]
          );
        } else {
          // Insert new thumbnail
          const [thumbResult] = await pool.execute(
            `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
             VALUES (?, ?, ?, ?, 3, ?, 'image/jpeg', 'jpg')`,
            [
              actressId,
              thumbPath,
              thumbMetadata.width || targetWidth,
              thumbMetadata.height || TARGET_HEIGHT,
              galleryImg.id
            ]
          ) as any;

          // Update gallery image with thumbnail ID
          await pool.execute(
            `UPDATE images SET thumbid = ? WHERE id = ?`,
            [thumbResult.insertId, galleryImg.id]
          );
        }

        rebuiltCount++;
      } catch (error: any) {
        errors.push(`Error processing image ${galleryImg.id}: ${error.message}`);
        console.error(`  Error rebuilding thumbnail for image ${galleryImg.id}:`, error.message);
      }
    }

    return { success: true, count: rebuiltCount, errors };
  } catch (error: any) {
    return { success: false, count: rebuiltCount, errors: [error.message] };
  }
}

async function main() {
  console.log('🔄 Starting thumbnail rebuild for all actresses...\n');

  try {
    // Get all actresses with gallery images
    const [actresses] = await pool.execute(
      `SELECT DISTINCT g.id, g.nm as name
       FROM girls g
       INNER JOIN images i ON g.id = i.girlid
       WHERE g.published = 2
         AND i.mytp = 4
         AND i.path IS NOT NULL 
         AND i.path != ''
       ORDER BY g.id ASC`
    ) as any[];

    if (!Array.isArray(actresses) || actresses.length === 0) {
      console.log('❌ No actresses with gallery images found');
      process.exit(1);
    }

    const totalActresses = actresses.length;
    console.log(`📊 Found ${totalActresses} actresses with gallery images\n`);

    let totalRebuilt = 0;
    let totalErrors = 0;
    let processed = 0;

    // Process in batches
    for (let i = 0; i < actresses.length; i += BATCH_SIZE) {
      const batch = actresses.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} actresses)...`);

      for (const actress of batch) {
        processed++;
        const progress = ((processed / totalActresses) * 100).toFixed(1);
        
        process.stdout.write(`\r  [${processed}/${totalActresses}] (${progress}%) Rebuilding thumbnails for ${actress.name || `ID ${actress.id}`}...`);

        const result = await rebuildThumbnailsForActress(actress.id);
        
        if (result.success) {
          totalRebuilt += result.count;
          if (result.errors.length > 0) {
            totalErrors += result.errors.length;
            console.log(`\n    ⚠️  ${result.errors.length} error(s) for actress ${actress.id}`);
          }
        } else {
          totalErrors += result.errors.length;
          console.log(`\n    ❌ Failed to rebuild thumbnails for actress ${actress.id}`);
        }
      }
    }

    console.log('\n\n✅ Thumbnail rebuild complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Total actresses processed: ${processed}`);
    console.log(`   - Total thumbnails rebuilt: ${totalRebuilt}`);
    console.log(`   - Total errors: ${totalErrors}`);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

main();

