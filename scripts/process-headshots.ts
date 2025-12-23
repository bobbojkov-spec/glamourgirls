import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

/**
 * Process headshots for all actresses
 * - Finds portrait-oriented GIF or PNG files
 * - Crops: 40px top, 40px bottom, 25px left, 28px right
 * - Saves as headshot.jpg
 */

async function processHeadshot(actressId: string, folder: string): Promise<boolean> {
  try {
    const headshotPath = path.join(folder, 'headshot.jpg');
    
    // Check if headshot already exists
    try {
      await fs.access(headshotPath);
      return false; // Already exists, skip
    } catch {
      // Doesn't exist, continue
    }

    // Read folder contents
    const files = await fs.readdir(folder);
    
    // Look for GIF and PNG files - the headshot is usually the portrait-oriented one
    const imageFiles = files.filter(f => {
      const ext = f.toLowerCase();
      return ext.endsWith('.gif') || ext.endsWith('.png');
    });
    
    let sourceImagePath: string | null = null;
    
    for (const imageFile of imageFiles) {
      const imagePath = path.join(folder, imageFile);
      try {
        const metadata = await sharp(imagePath).metadata();
        
        // Headshot is typically portrait-oriented (height > width)
        if (metadata.height && metadata.width && metadata.height > metadata.width) {
          sourceImagePath = imagePath;
          break;
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    if (!sourceImagePath) {
      return false; // No headshot found
    }

    // Process the image: crop 40px from top, 40px from bottom, 25px from left, 28px from right
    const imageBuffer = await fs.readFile(sourceImagePath);
    const metadata = await sharp(imageBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      console.error(`Invalid dimensions for ${actressId}: ${sourceImagePath}`);
      return false;
    }

    const left = 25;
    const top = 40;
    const width = metadata.width - 53; // 25px from left, 28px from right
    const height = metadata.height - 80; // 40px from top and bottom

    // Validate crop dimensions
    if (width <= 0 || height <= 0 || left + width > metadata.width || top + height > metadata.height) {
      console.error(`Invalid crop dimensions for ${actressId}: ${metadata.width}x${metadata.height} -> ${width}x${height}`);
      return false;
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
    console.log(`✓ Processed headshot for actress ${actressId} from ${path.basename(sourceImagePath)}`);
    return true;
  } catch (error) {
    console.error(`Error processing headshot for ${actressId}:`, error);
    return false;
  }
}

async function main() {
  const baseDir = path.join(process.cwd(), 'public');
  const folders = ['newpic', 'securepic'];
  
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const folderName of folders) {
    const folderPath = path.join(baseDir, folderName);
    
    try {
      const actressFolders = await fs.readdir(folderPath);
      
      for (const actressId of actressFolders) {
        const actressFolder = path.join(folderPath, actressId);
        
        try {
          const stats = await fs.stat(actressFolder);
          if (!stats.isDirectory()) continue;
          
          const processed = await processHeadshot(actressId, actressFolder);
          if (processed) {
            totalProcessed++;
          } else {
            totalSkipped++;
          }
        } catch (error) {
          console.error(`Error accessing folder ${actressId}:`, error);
          totalErrors++;
        }
      }
    } catch (error) {
      console.error(`Error reading ${folderName} folder:`, error);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed: ${totalProcessed}`);
  console.log(`Skipped (already exists or no headshot found): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
}

main().catch(console.error);

