import sharp from 'sharp';
import pool from '../src/lib/db';
import path from 'path';
import fs from 'fs/promises';

// Era mapping: era name -> database value
const ERA_MAP: Record<string, number> = {
  '1930s': 1,
  '1940s': 2,
  '1950s': 3,
  '1960s': 4,
};

interface ImageData {
  path: string;
  width: number;
  height: number;
}

/**
 * Generate a creative collage background for hero section
 * Creates a "thrown pictures on the floor" mosaic effect
 */
async function generateHeroCollage(era: string, version: number = 1): Promise<string> {
  const eraValue = ERA_MAP[era];
  if (!eraValue) {
    throw new Error(`Invalid era: ${era}. Valid eras: 1930s, 1940s, 1950s, 1960s`);
  }

  console.log(`\n🎨 Generating hero collage for ${era} (version ${version})...`);

  // Get random gallery images for this era
  const [images] = await pool.execute(
    `SELECT 
       i.path as imagePath,
       i.width,
       i.height
     FROM images i
     INNER JOIN girls g ON i.girlid = g.id
     WHERE g.published = 2 
       AND g.godini = ?
       AND g.theirman != 1
       AND i.mytp = 4
       AND i.path IS NOT NULL 
       AND i.path != ''
       AND i.width > 0
       AND i.height > 0
     ORDER BY random()
     LIMIT 30`,
    [eraValue]
  ) as any[];

  if (!Array.isArray(images) || images.length < 20) {
    throw new Error(`Not enough images found for era ${era}. Found: ${images?.length || 0}, need at least 20`);
  }

  console.log(`📸 Found ${images.length} images for collage`);

  // Hero dimensions: long side 1500px, maintain aspect ratio
  // Typical hero is wide (16:9 or similar), so let's use 1500x844 (16:9)
  const HERO_WIDTH = 1500;
  const HERO_HEIGHT = 844;
  const CANVAS_WIDTH = HERO_WIDTH;
  const CANVAS_HEIGHT = HERO_HEIGHT;

  // Create base canvas with a subtle vintage background color
  const backgroundColors = [
    { r: 45, g: 40, b: 35 },   // Dark brown
    { r: 60, g: 55, b: 50 },   // Medium brown
    { r: 35, g: 30, b: 25 },   // Very dark brown
  ];
  const bgColor = backgroundColors[version % backgroundColors.length];

  // Create base image
  const baseImage = sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: { r: bgColor.r, g: bgColor.g, b: bgColor.b },
    },
  });

  // Prepare images for collage
  const publicDir = path.join(process.cwd(), 'public');
  const imageBuffers: Array<{ buffer: Buffer; width: number; height: number; x: number; y: number; rotation: number; scale: number }> = [];

  // Random seed for this version to get different layouts
  const seed = version * 1000 + eraValue * 100;
  const random = (min: number, max: number) => {
    seed;
    return Math.random() * (max - min) + min;
  };

  // Load and prepare images
  for (let i = 0; i < Math.min(images.length, 30); i++) {
    const img = images[i];
    const imagePath = img.imagePath.startsWith('/') 
      ? img.imagePath.slice(1) 
      : img.imagePath;
    
    const fullPath = path.join(publicDir, imagePath);

    try {
      // Check if file exists
      await fs.access(fullPath);
      
      // Load image
      const imageBuffer = await fs.readFile(fullPath);
      const metadata = await sharp(imageBuffer).metadata();
      
      if (!metadata.width || !metadata.height) continue;

      // Calculate size for collage (vary sizes for visual interest)
      const baseSize = random(120, 250); // Base size varies
      const aspectRatio = metadata.width / metadata.height;
      
      let collageWidth: number;
      let collageHeight: number;
      
      if (aspectRatio > 1) {
        // Landscape
        collageWidth = baseSize;
        collageHeight = baseSize / aspectRatio;
      } else {
        // Portrait
        collageWidth = baseSize * aspectRatio;
        collageHeight = baseSize;
      }

      // Random position (with some overlap allowed for mosaic effect)
      const x = random(-collageWidth * 0.2, CANVAS_WIDTH - collageWidth * 0.8);
      const y = random(-collageHeight * 0.2, CANVAS_HEIGHT - collageHeight * 0.8);
      
      // Random rotation (-15 to +15 degrees for "thrown" effect)
      const rotation = random(-15, 15);
      
      // Random scale variation (0.8 to 1.2)
      const scale = random(0.8, 1.2);

      // Resize and prepare image
      const resizedBuffer = await sharp(imageBuffer)
        .resize(Math.round(collageWidth * scale), Math.round(collageHeight * scale), {
          fit: 'cover',
          position: 'center',
        })
        .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .jpeg({ quality: 85 })
        .toBuffer();

      const finalMetadata = await sharp(resizedBuffer).metadata();
      
      imageBuffers.push({
        buffer: resizedBuffer,
        width: finalMetadata.width || collageWidth,
        height: finalMetadata.height || collageHeight,
        x: Math.round(x),
        y: Math.round(y),
        rotation: rotation,
        scale: scale,
      });

      console.log(`  ✓ Processed image ${i + 1}/${Math.min(images.length, 30)}`);
    } catch (error: any) {
      console.warn(`  ⚠️  Skipped image ${i + 1}: ${error.message}`);
      continue;
    }
  }

  if (imageBuffers.length < 15) {
    throw new Error(`Not enough valid images processed. Got ${imageBuffers.length}, need at least 15`);
  }

  console.log(`🎨 Composing collage with ${imageBuffers.length} images...`);

  // Composite all images onto base
  const composites = imageBuffers.map((img, index) => ({
    input: img.buffer,
    left: img.x,
    top: img.y,
    blend: 'over' as const,
  }));

  // Generate final collage
  const collageBuffer = await baseImage
    .composite(composites)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  // Save to /public/images/
  const outputDir = path.join(publicDir, 'images');
  await fs.mkdir(outputDir, { recursive: true });
  
  const filename = `hero-collage-${era}-v${version}.jpg`;
  const outputPath = path.join(outputDir, filename);
  await fs.writeFile(outputPath, collageBuffer);

  console.log(`✅ Collage saved: ${filename}`);
  console.log(`   Size: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}px`);
  console.log(`   Images used: ${imageBuffers.length}`);

  return `/images/${filename}`;
}

// CLI usage
if (require.main === module) {
  const era = process.argv[2] || '1930s';
  const version = parseInt(process.argv[3] || '1');

  generateHeroCollage(era, version)
    .then((filepath) => {
      console.log(`\n✨ Success! Collage saved to: ${filepath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

export default generateHeroCollage;

