/**
 * Script to fix headshot for actress 901 (Carol Anders)
 * Checks for existing images and generates headshot if needed
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const ACTRESS_ID = '901';

async function fixHeadshot() {
  const baseDir = path.join(process.cwd(), 'public');
  const folders = [
    path.join(baseDir, 'newpic', ACTRESS_ID),
    path.join(baseDir, 'securepic', ACTRESS_ID),
  ];

  console.log(`🔍 Checking headshot for actress ${ACTRESS_ID}...\n`);

  for (const folder of folders) {
    try {
      // Check if folder exists
      await fs.access(folder);
      console.log(`✓ Folder exists: ${folder}`);

      // List all files
      const files = await fs.readdir(folder);
      console.log(`  Files found: ${files.length}`);
      files.forEach(f => console.log(`    - ${f}`));

      // Check if headshot.jpg already exists
      const headshotPath = path.join(folder, 'headshot.jpg');
      try {
        await fs.access(headshotPath);
        console.log(`\n✅ Headshot already exists: ${headshotPath}`);
        return;
      } catch {
        console.log(`\n⚠️  Headshot.jpg not found, looking for source image...`);
      }

      // Look for GIF, PNG, or JPG files
      const imageFiles = files.filter(f => {
        const ext = f.toLowerCase();
        return ext.endsWith('.gif') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg');
      });

      if (imageFiles.length === 0) {
        console.log(`  ❌ No image files found in ${folder}`);
        continue;
      }

      console.log(`  Found ${imageFiles.length} image file(s)`);

      // Try to find a portrait-oriented image
      let sourceImagePath: string | null = null;
      let sourceMetadata: any = null;

      for (const imageFile of imageFiles) {
        const imagePath = path.join(folder, imageFile);
        try {
          const metadata = await sharp(imagePath).metadata();
          console.log(`  Checking ${imageFile}: ${metadata.width}x${metadata.height}`);
          
          // Headshot is typically portrait-oriented (height > width)
          // But also accept square or slightly landscape if it's the only image
          if (metadata.height && metadata.width) {
            if (metadata.height > metadata.width || imageFiles.length === 1) {
              sourceImagePath = imagePath;
              sourceMetadata = metadata;
              console.log(`  ✓ Selected: ${imageFile} (${metadata.width}x${metadata.height})`);
              break;
            }
          }
        } catch (error) {
          console.log(`  ⚠️  Could not read ${imageFile}:`, error);
          continue;
        }
      }

      if (!sourceImagePath) {
        console.log(`  ❌ No suitable source image found`);
        continue;
      }

      // Process the image
      console.log(`\n🔄 Processing headshot...`);
      const imageBuffer = await fs.readFile(sourceImagePath);
      const metadata = sourceMetadata || await sharp(imageBuffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        console.error(`  ❌ Invalid dimensions: ${metadata.width}x${metadata.height}`);
        continue;
      }

      // Crop parameters: 40px top, 40px bottom, 25px left, 28px right
      const left = 25;
      const top = 40;
      const width = Math.max(1, metadata.width - 53); // 25px from left, 28px from right
      const height = Math.max(1, metadata.height - 80); // 40px from top and bottom

      // Validate crop dimensions
      if (width <= 0 || height <= 0 || left + width > metadata.width || top + height > metadata.height) {
        console.error(`  ❌ Invalid crop dimensions: ${metadata.width}x${metadata.height} -> ${width}x${height}`);
        console.log(`  Trying without crop...`);
        
        // If crop doesn't work, just convert to JPEG without cropping
        const processedImage = await sharp(imageBuffer)
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
        
        await fs.writeFile(headshotPath, processedImage);
        console.log(`  ✅ Created headshot.jpg (no crop applied)`);
        return;
      }

      // Crop and convert to JPEG
      const processedImage = await sharp(imageBuffer)
        .extract({
          left,
          top,
          width,
          height,
        })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();

      // Save as headshot.jpg
      await fs.writeFile(headshotPath, processedImage);
      console.log(`  ✅ Created headshot.jpg (cropped: ${width}x${height})`);
      return;

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`  ⚠️  Folder doesn't exist: ${folder}`);
        continue;
      }
      console.error(`  ❌ Error processing ${folder}:`, error);
    }
  }

  console.log(`\n❌ Could not create headshot for actress ${ACTRESS_ID}`);
  console.log(`   Please check if image files exist in public/newpic/901 or public/securepic/901`);
}

fixHeadshot().catch(console.error);

