import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actressId: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { actressId } = await params;
    const actressIdNum = parseInt(actressId);

    if (isNaN(actressIdNum)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    // Get all gallery images (mytp = 4) for this actress
    const [galleryImages] = await pool.execute(
      `SELECT id, path, width, height, thumbid 
       FROM images 
       WHERE girlid = ? AND mytp = 4 AND path IS NOT NULL AND path != ''`,
      [actressIdNum]
    ) as any[];

    if (!Array.isArray(galleryImages) || galleryImages.length === 0) {
      return NextResponse.json({ 
        error: 'No gallery images found for this actress',
        count: 0 
      }, { status: 404 });
    }

    const publicDir = path.resolve(process.cwd(), 'public');
    let rebuiltCount = 0;
    const errors: string[] = [];

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
        const targetHeight = 250;
        const aspectRatio = originalWidth / originalHeight;
        const targetWidth = Math.round(targetHeight * aspectRatio);

        // Generate thumbnail with high quality settings
        const thumbnailBuffer = await sharp(galleryBuffer)
          .resize(targetWidth, targetHeight, {
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
        // If thumbnail already exists, use its path, otherwise create new path
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
              thumbMetadata.height || targetHeight,
              galleryImg.thumbid
            ]
          );
        } else {
          // Insert new thumbnail
          const [thumbResult] = await pool.execute(
            `INSERT INTO images (girlid, path, width, height, mytp, thumbid, mimetype, sz) 
             VALUES (?, ?, ?, ?, 3, ?, 'image/jpeg', 'jpg')`,
            [
              actressIdNum,
              thumbPath,
              thumbMetadata.width || targetWidth,
              thumbMetadata.height || targetHeight,
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
        console.error(`Error rebuilding thumbnail for image ${galleryImg.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      actressId: actressIdNum,
      totalImages: galleryImages.length,
      rebuilt: rebuiltCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error rebuilding thumbnails:', error);
    return NextResponse.json(
      { error: 'Failed to rebuild thumbnails', details: error.message },
      { status: 500 }
    );
  }
}

