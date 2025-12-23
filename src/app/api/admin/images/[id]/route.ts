import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { id } = await params;
    const imageId = parseInt(id);

    if (isNaN(imageId)) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
    }

    // Get image info from database
    const [images] = await pool.execute(
      `SELECT id, path, mytp, thumbid, girlid FROM images WHERE id = ?`,
      [imageId]
    );

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = images[0] as any;

    // Delete physical file
    if (image.path) {
      const filePath = path.join(process.cwd(), 'public', image.path.startsWith('/') ? image.path.slice(1) : image.path);
      try {
        await unlink(filePath);
      } catch (error) {
        console.warn('Could not delete physical file:', filePath, error);
        // Continue with database deletion even if file doesn't exist
      }
    }

    // If this is a gallery image (mytp=4), also delete its thumbnail
    if (image.mytp === 4 && image.thumbid) {
      const [thumbImages] = await pool.execute(
        `SELECT path FROM images WHERE id = ?`,
        [image.thumbid]
      );
      
      if (Array.isArray(thumbImages) && thumbImages.length > 0) {
        const thumb = thumbImages[0] as any;
        if (thumb.path) {
          const thumbPath = path.join(process.cwd(), 'public', thumb.path.startsWith('/') ? thumb.path.slice(1) : thumb.path);
          try {
            await unlink(thumbPath);
          } catch (error) {
            console.warn('Could not delete thumbnail file:', thumbPath, error);
          }
        }
        // Delete thumbnail from database
        await pool.execute(`DELETE FROM images WHERE id = ?`, [image.thumbid]);
      }
    }

    // If this is a thumbnail (mytp=3), update the gallery image's thumbid
    if (image.mytp === 3) {
      await pool.execute(
        `UPDATE images SET thumbid = 0 WHERE thumbid = ?`,
        [imageId]
      );
    }

    // Delete the image from database
    await pool.execute(`DELETE FROM images WHERE id = ?`, [imageId]);

    return NextResponse.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

