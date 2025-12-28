import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';
import { createClient } from '@supabase/supabase-js';

/**
 * Delete a file from Supabase Storage
 * @param storagePath - Path in storage (without leading slash)
 * @param bucket - Bucket name
 * @returns true if deleted successfully or not found, false on error
 */
async function deleteFromSupabaseStorage(
  storagePath: string,
  bucket: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { success: false, error: 'Supabase configuration missing' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Remove leading slash and normalize path
    const cleanPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([cleanPath]);

    if (error) {
      // If file doesn't exist, that's okay - it's already deleted
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Find HQ image associated with a gallery image by ID pattern
 * @param galleryId - Gallery image ID
 * @param girlId - Girl ID (for additional validation)
 * @returns HQ image record or null
 */
async function findHQImage(galleryId: number, girlId: number): Promise<any | null> {
  try {
    // Try galleryId - 1 first (most common pattern)
    const [hqImages1] = await pool.execute(
      `SELECT id, path FROM images WHERE id = ? AND mytp = 5 AND girlid = ?`,
      [galleryId - 1, girlId]
    ) as any[];

    if (Array.isArray(hqImages1) && hqImages1.length > 0) {
      return hqImages1[0];
    }

    // Try galleryId + 1
    const [hqImages2] = await pool.execute(
      `SELECT id, path FROM images WHERE id = ? AND mytp = 5 AND girlid = ?`,
      [galleryId + 1, girlId]
    ) as any[];

    if (Array.isArray(hqImages2) && hqImages2.length > 0) {
      return hqImages2[0];
    }

    return null;
  } catch (error) {
    console.error('Error finding HQ image:', error);
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  
  const deletionErrors: string[] = [];
  const deletionWarnings: string[] = [];

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
    const imageMytp = Number(image.mytp);
    const imagePath = image.path;
    const imageGirlId = Number(image.girlid);

    // Track what needs to be deleted
    const filesToDelete: Array<{ path: string; bucket: string; type: string }> = [];
    const dbIdsToDelete: number[] = [imageId];

    // If this is a gallery image (mytp=4), find and delete related assets
    if (imageMytp === 4) {
      // 1. Find and delete HQ image
      const hqImage = await findHQImage(imageId, imageGirlId);
      if (hqImage) {
        dbIdsToDelete.push(Number(hqImage.id));
        if (hqImage.path) {
          // HQ images are in images_raw bucket
          filesToDelete.push({
            path: hqImage.path,
            bucket: 'images_raw',
            type: 'HQ image'
          });
        }
      }

      // 2. Find and delete thumbnail
      if (image.thumbid) {
        const [thumbImages] = await pool.execute(
          `SELECT id, path FROM images WHERE id = ?`,
          [image.thumbid]
        ) as any[];
        
        if (Array.isArray(thumbImages) && thumbImages.length > 0) {
          const thumb = thumbImages[0] as any;
          dbIdsToDelete.push(Number(thumb.id));
          if (thumb.path) {
            // Thumbnails are in glamourgirls_images bucket
            filesToDelete.push({
              path: thumb.path,
              bucket: 'glamourgirls_images',
              type: 'thumbnail'
            });
          }
        }
      }

      // 3. Delete gallery image from storage
      if (imagePath) {
        filesToDelete.push({
          path: imagePath,
          bucket: 'glamourgirls_images',
          type: 'gallery image'
        });
      }
    } else if (imageMytp === 5) {
      // If this is an HQ image, delete it from images_raw bucket
      if (imagePath) {
        filesToDelete.push({
          path: imagePath,
          bucket: 'images_raw',
          type: 'HQ image'
        });
      }
    } else if (imageMytp === 3) {
      // If this is a thumbnail, delete it and update gallery image's thumbid
      if (imagePath) {
        filesToDelete.push({
          path: imagePath,
          bucket: 'glamourgirls_images',
          type: 'thumbnail'
        });
      }
      // Update gallery image's thumbid to 0
      await pool.execute(
        `UPDATE images SET thumbid = 0 WHERE thumbid = ?`,
        [imageId]
      );
    } else {
      // For other types, try to delete from glamourgirls_images bucket
      if (imagePath) {
        filesToDelete.push({
          path: imagePath,
          bucket: 'glamourgirls_images',
          type: 'image'
        });
      }
    }

    // Delete all files from Supabase Storage
    for (const file of filesToDelete) {
      const storagePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
      const result = await deleteFromSupabaseStorage(storagePath, file.bucket);
      
      if (!result.success) {
        const errorMsg = `Failed to delete ${file.type} from Supabase Storage (${file.bucket}/${storagePath}): ${result.error}`;
        deletionErrors.push(errorMsg);
        console.error(errorMsg);
      } else {
        console.log(`✓ Deleted ${file.type} from Supabase Storage: ${file.bucket}/${storagePath}`);
      }
    }

    // Also try to delete from local filesystem (legacy support)
    if (imagePath) {
      const filePath = path.join(process.cwd(), 'public', imagePath.startsWith('/') ? imagePath.slice(1) : imagePath);
      try {
        await unlink(filePath);
      } catch (error) {
        // Local file deletion is optional - files are in Supabase now
        deletionWarnings.push(`Local file not found (expected if using Supabase): ${filePath}`);
      }
    }

    // Delete all related database records
    for (const dbId of dbIdsToDelete) {
      try {
        await pool.execute(`DELETE FROM images WHERE id = ?`, [dbId]);
        console.log(`✓ Deleted image record from database: ID ${dbId}`);
      } catch (error: any) {
        const errorMsg = `Failed to delete image record from database (ID ${dbId}): ${error.message}`;
        deletionErrors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // If there were critical errors (database deletion failures), return error
    // Storage deletion failures are logged but don't block the operation
    if (deletionErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Some deletions failed',
        details: deletionErrors,
        warnings: deletionWarnings.length > 0 ? deletionWarnings : undefined,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Image and all related assets deleted successfully',
      warnings: deletionWarnings.length > 0 ? deletionWarnings : undefined,
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



