/**
 * Upload GG_KEY_VISUAL.jpg to Supabase Storage and update site_settings
 * 
 * Usage: npx tsx scripts/upload-hero-key-visual.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { uploadToStorage } from '@/lib/supabase/storage';
import pool from '@/lib/db';
import { getStorageUrl } from '@/lib/supabase/storage';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
  try {
    // Check Supabase configuration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
      process.exit(1);
    }

    // Read the image file
    const imagePath = path.join(process.cwd(), 'public', 'GG_KEY_ VISUAL.jpg');
    
    if (!fs.existsSync(imagePath)) {
      console.error(`Error: Image file not found at ${imagePath}`);
      process.exit(1);
    }

    console.log('Reading image file...');
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`Image size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Supabase Storage
    const storagePath = 'hero/GG_KEY_VISUAL.jpg';
    console.log(`Uploading to Supabase Storage: ${storagePath}...`);
    
    const uploadedPath = await uploadToStorage(
      storagePath,
      imageBuffer,
      'glamourgirls_images',
      'image/jpeg'
    );

    if (!uploadedPath) {
      console.error('Error: Failed to upload image to Supabase Storage');
      process.exit(1);
    }

    console.log(`✓ Image uploaded successfully to: ${uploadedPath}`);

    // Get the public URL
    const publicUrl = getStorageUrl(`/${uploadedPath}`, 'glamourgirls_images');
    console.log(`Public URL: ${publicUrl}`);

    // Update site_settings table
    console.log('Updating site_settings...');
    await pool.execute(
      `INSERT INTO site_settings (setting_key, setting_value, updated_at)
       VALUES ('hero_image_path', ?, CURRENT_TIMESTAMP)
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP`,
      [`/${uploadedPath}`, `/${uploadedPath}`]
    );

    console.log('✓ Site settings updated successfully');
    console.log(`\nHero image path set to: /${uploadedPath}`);
    console.log(`Public URL: ${publicUrl}`);
    console.log('\nDone!');

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

