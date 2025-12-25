/**
 * Script to create headshot for actress 309 (Virginia Hill)
 * Uses the second GIF file (ID 1488) to generate headshot.jpg
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ACTRESS_ID = '309';
const SOURCE_IMAGE_PATH = '/securepic/309/1488.gif'; // Second GIF

// Allow custom old files directory path via environment variable or command line
const OLD_FILES_DIR = process.env.OLD_FILES_DIR || process.argv[2] || null;

async function createHeadshot() {
  console.log(`🔍 Creating headshot for actress ${ACTRESS_ID} from ${SOURCE_IMAGE_PATH}...\n`);

  try {
    // Try to fetch from Supabase Storage first
    let imageBuffer: Buffer | null = null;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        console.log('📥 Fetching image from Supabase Storage...');
        const supabase = createClient(supabaseUrl, supabaseKey);
        const cleanPath = SOURCE_IMAGE_PATH.startsWith('/') ? SOURCE_IMAGE_PATH.slice(1) : SOURCE_IMAGE_PATH;
        
        const { data, error } = await supabase.storage
          .from('glamourgirls_images')
          .download(cleanPath);
        
        if (error) {
          console.log('⚠️  Could not fetch from Supabase Storage:', error.message);
        } else if (data) {
          const arrayBuffer = await data.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
          console.log('✅ Image fetched from Supabase Storage');
        }
      } catch (storageError: any) {
        console.log('⚠️  Could not fetch from Supabase Storage:', storageError.message);
      }
    } else {
      console.log('⚠️  Supabase credentials not configured');
    }

    // Fallback: try local file
    if (!imageBuffer) {
      const localPath = path.join(process.cwd(), 'public', SOURCE_IMAGE_PATH);
      try {
        console.log(`📂 Trying local file: ${localPath}`);
        imageBuffer = await fs.readFile(localPath);
        console.log('✅ Image loaded from local file');
      } catch (localError: any) {
        // Try alternative paths
        const altPaths: string[] = [
          path.join(process.cwd(), 'old', SOURCE_IMAGE_PATH),
          path.join(process.cwd(), 'old_files', SOURCE_IMAGE_PATH),
          path.join(process.cwd(), 'backups', 'images', SOURCE_IMAGE_PATH),
          path.join(process.cwd(), 'backups', SOURCE_IMAGE_PATH),
        ];
        
        // Add custom old files directory if provided
        if (OLD_FILES_DIR) {
          altPaths.unshift(path.join(OLD_FILES_DIR, SOURCE_IMAGE_PATH));
          altPaths.unshift(path.join(OLD_FILES_DIR, 'securepic', '309', '1488.gif'));
          altPaths.unshift(path.join(OLD_FILES_DIR, '309', '1488.gif'));
        }
        
        let found = false;
        for (const altPath of altPaths) {
          try {
            console.log(`📂 Trying alternative path: ${altPath}`);
            imageBuffer = await fs.readFile(altPath);
            console.log('✅ Image loaded from alternative path');
            found = true;
            break;
          } catch {
            continue;
          }
        }
        
        if (!found) {
          console.error('❌ Could not find source image in any location.');
          console.error('   Tried:');
          console.error(`   - ${localPath}`);
          altPaths.forEach(p => console.error(`   - ${p}`));
          console.error('\n💡 To specify a custom old files directory, run:');
          console.error('   OLD_FILES_DIR=/path/to/old/files npx tsx scripts/create-headshot-309.ts');
          console.error('   OR');
          console.error('   npx tsx scripts/create-headshot-309.ts /path/to/old/files');
          throw new Error('Could not find source image. Please provide the path to the old files directory.');
        }
      }
    }

    if (!imageBuffer) {
      throw new Error('No image buffer available');
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`\n📐 Original dimensions: ${metadata.width} × ${metadata.height}`);

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    // Process headshot to exact size: 190px width × 245px height
    const TARGET_WIDTH = 190;
    const TARGET_HEIGHT = 245;

    console.log(`\n🔄 Processing headshot to ${TARGET_WIDTH} × ${TARGET_HEIGHT}...`);

    // Step 1: Resize height to 245px (maintain aspect ratio, allow enlarging if smaller)
    let processedImage = sharp(imageBuffer).resize(null, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: false, // Allow enlarging smaller images
    });

    // Step 2: Get dimensions after height resize
    const resizedBuffer = await processedImage.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();
    const resizedWidth = resizedMeta.width || TARGET_WIDTH;

    console.log(`   After height resize: ${resizedWidth} × ${TARGET_HEIGHT}`);

    // Step 3: Crop width to 190px (centered) if needed
    if (resizedWidth > TARGET_WIDTH) {
      const cropLeft = Math.floor((resizedWidth - TARGET_WIDTH) / 2);
      console.log(`   Cropping width: removing ${cropLeft}px from left`);
      processedImage = sharp(resizedBuffer).extract({
        left: cropLeft,
        top: 0,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
      });
    } else if (resizedWidth < TARGET_WIDTH) {
      // If width is smaller, resize to exact dimensions (cover mode)
      console.log(`   Resizing to cover: ${TARGET_WIDTH} × ${TARGET_HEIGHT}`);
      processedImage = sharp(resizedBuffer).resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover', // Cover the area, may crop
      });
    }

    // Convert to JPEG
    const finalBuffer = await processedImage
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const finalMetadata = await sharp(finalBuffer).metadata();
    console.log(`\n✅ Final headshot: ${finalMetadata.width} × ${finalMetadata.height}`);

    // Save to both local and Supabase
    const outputPaths = [
      path.join(process.cwd(), 'public', 'newpic', ACTRESS_ID, 'headshot.jpg'),
      path.join(process.cwd(), 'public', 'securepic', ACTRESS_ID, 'headshot.jpg'),
    ];

    for (const outputPath of outputPaths) {
      try {
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });
        
        // Save file
        await fs.writeFile(outputPath, finalBuffer);
        console.log(`💾 Saved: ${outputPath}`);
      } catch (saveError: any) {
        console.log(`⚠️  Could not save to ${outputPath}: ${saveError.message}`);
      }
    }

    // Also try to upload to Supabase if configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const supabasePath = `newpic/${ACTRESS_ID}/headshot.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('glamourgirls_images')
          .upload(supabasePath, finalBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.log(`⚠️  Could not upload to Supabase: ${uploadError.message}`);
        } else {
          console.log(`☁️  Uploaded to Supabase: ${supabasePath}`);
        }
      } catch (supabaseError: any) {
        console.log(`⚠️  Supabase upload skipped: ${supabaseError.message}`);
      }
    }

    console.log('\n✅ Headshot created successfully!');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createHeadshot();

