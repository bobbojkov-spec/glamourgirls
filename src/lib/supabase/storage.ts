/**
 * Utility functions for working with Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase client for server-side operations
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Service Role Key must be set');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Convert a database path (e.g., "/securepic/1/3.jpg") to a Supabase Storage public URL
 * @param dbPath - Database path from images.path column
 * @param bucket - Storage bucket name (default: 'glamourgirls_images')
 * @returns Public URL to the image in Supabase Storage
 */
export function getStorageUrl(dbPath: string | null | undefined, bucket: string = 'glamourgirls_images'): string | null {
  if (!dbPath) return null;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
    return null;
  }

  // Remove leading slash and normalize path
  const cleanPath = dbPath.startsWith('/') ? dbPath.slice(1) : dbPath;
  
  // Construct public storage URL
  // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  const storageUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
  
  return storageUrl;
}

/**
 * Fetch an image from Supabase Storage
 * @param dbPath - Database path from images.path column
 * @param bucket - Storage bucket name (default: 'glamourgirls_images')
 * @returns Image buffer or null if fetch fails
 */
export async function fetchFromStorage(
  dbPath: string | null | undefined,
  bucket: string = 'glamourgirls_images'
): Promise<Buffer | null> {
  const storageUrl = getStorageUrl(dbPath, bucket);
  if (!storageUrl) return null;

  try {
    const response = await fetch(storageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch from storage: ${storageUrl} (${response.status})`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error fetching from storage: ${storageUrl}`, error);
    return null;
  }
}

/**
 * Upload a file to Supabase Storage
 * @param filePath - Storage path (e.g., "collages/hero-collage-1930s-v1.jpg")
 * @param buffer - File buffer to upload
 * @param bucket - Storage bucket name (default: 'glamourgirls_images')
 * @param contentType - MIME type (default: 'image/jpeg')
 * @returns Storage path if successful, null if failed
 */
export async function uploadToStorage(
  filePath: string,
  buffer: Buffer,
  bucket: string = 'glamourgirls_images',
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Remove leading slash and normalize path
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(cleanPath, buffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error(`Failed to upload to Supabase Storage: ${error.message}`);
      return null;
    }

    return cleanPath;
  } catch (error: any) {
    console.error(`Error uploading to storage: ${filePath}`, error);
    return null;
  }
}

