import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import pool from '@/lib/db';
import path from 'path';
import fs from 'fs/promises';
import { requireAdminApi } from '@/app/api/admin/_auth';

export const runtime = 'nodejs';

// Era mapping: era name -> database value
const ERA_MAP: Record<string, number> = {
  '1930s': 1,
  '1940s': 2,
  '1950s': 3,
  '1960s': 4,
};

/**
 * Generate a creative collage background for hero section
 * Creates a "thrown pictures on the floor" mosaic effect
 * @param generationId - Unique ID to ensure different collages each time (timestamp or counter)
 */
async function generateHeroCollage(era: string, version: number = 1, generationId: number = Date.now()): Promise<string> {
  const eraValue = ERA_MAP[era];
  if (!eraValue) {
    throw new Error(`Invalid era: ${era}. Valid eras: 1930s, 1940s, 1950s, 1960s`);
  }

  console.log(`\n🎨 Generating hero collage for ${era} (version ${version})...`);

  // Get random gallery images for this era - get more to ensure good coverage
  const [images] = await pool.execute(
    `SELECT 
       i.path as imagePath,
       i.width,
       i.height
     FROM images i
     INNER JOIN girls g ON i.girlid = g.id
     WHERE g.published = 2 
       AND g.godini = ?
       AND (g.theirman = false OR g.theirman IS NULL)
       AND i.mytp = 4
       AND i.path IS NOT NULL 
       AND i.path != ''
       AND i.width > 0
       AND i.height > 0
     ORDER BY RANDOM()
     LIMIT 40`,
    [eraValue]
  ) as any[];

  if (!Array.isArray(images) || images.length < 20) {
    throw new Error(`Not enough images found for era ${era}. Found: ${images?.length || 0}, need at least 20`);
  }

  console.log(`📸 Found ${images.length} images for collage`);

  // Hero dimensions: 16:9 aspect ratio, long side 1500px
  // 16:9 = 1.777... so 1500 / 1.777 = 844px height
  const HERO_WIDTH = 1500;
  const HERO_HEIGHT = Math.round(1500 / (16/9)); // Exactly 844px for 16:9
  const CANVAS_WIDTH = HERO_WIDTH;
  const CANVAS_HEIGHT = HERO_HEIGHT;

  // Create base canvas with a subtle vintage background color
  const backgroundColors = [
    { r: 45, g: 40, b: 35 },   // Dark brown
    { r: 60, g: 55, b: 50 },   // Medium brown
    { r: 35, g: 30, b: 25 },   // Very dark brown
  ];
  const bgColor = backgroundColors[(version - 1) % backgroundColors.length];

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

  // Load and prepare images - use more images for better coverage
  for (let i = 0; i < Math.min(images.length, 35); i++) {
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

      // Calculate size for collage (vary sizes for visual interest - make them bigger)
      // Use version, era, generationId, and index to create unique layouts each time
      // generationId ensures different collages even with same era/version
      const baseSeed = version * 1000000 + eraValue * 10000 + generationId + i * 100;
      // Simple seeded random function
      const seededRandom = (offset: number = 0) => {
        const seed = baseSeed + offset;
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      
      // Make images bigger: 250-450px base size for better coverage
      const baseSize = 250 + seededRandom(1) * 200; // Base size varies 250-450
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

      // Random position with MORE overlap - allow images to go well outside bounds
      // This creates a more filled background
      const x = -collageWidth * 0.5 + seededRandom(2) * (CANVAS_WIDTH + collageWidth * 0.5);
      const y = -collageHeight * 0.5 + seededRandom(3) * (CANVAS_HEIGHT + collageHeight * 0.5);
      
      // Random rotation (-20 to +20 degrees for more "thrown" effect)
      const rotation = -20 + seededRandom(4) * 40;
      
      // Random scale variation (0.9 to 1.3 - bigger scale range)
      const scale = 0.9 + seededRandom(5) * 0.4;

      // Add white vintage frame around the image (like old photo frames)
      const frameWidth = 10; // 10px white frame for vintage look
      const frameColor = { r: 255, g: 255, b: 255, alpha: 1 };
      
      // First resize the image
      const resizedImage = await sharp(imageBuffer)
        .resize(Math.round(collageWidth * scale), Math.round(collageHeight * scale), {
          fit: 'cover',
          position: 'center',
        })
        .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .jpeg({ quality: 90 })
        .toBuffer();

      const imageMeta = await sharp(resizedImage).metadata();
      const imgWidth = imageMeta.width || collageWidth;
      const imgHeight = imageMeta.height || collageHeight;

      // Create frame by extending the canvas with white border
      const framedBuffer = await sharp(resizedImage)
        .extend({
          top: frameWidth,
          bottom: frameWidth,
          left: frameWidth,
          right: frameWidth,
          background: frameColor,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      const finalMetadata = await sharp(framedBuffer).metadata();
      const finalWidth = finalMetadata.width || (imgWidth + frameWidth * 2);
      const finalHeight = finalMetadata.height || (imgHeight + frameWidth * 2);
      
      // Adjust position to account for frame (center the frame, not the image)
      const adjustedX = Math.round(x - frameWidth);
      const adjustedY = Math.round(y - frameWidth);
      
      imageBuffers.push({
        buffer: framedBuffer,
        width: finalWidth,
        height: finalHeight,
        x: adjustedX,
        y: adjustedY,
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
  const composites = imageBuffers.map((img) => ({
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

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const body = await request.json();
    const { era, version, generationId } = body;

    if (!era || !['1930s', '1940s', '1950s', '1960s'].includes(era)) {
      return NextResponse.json(
        { success: false, error: 'Invalid era. Must be: 1930s, 1940s, 1950s, or 1960s' },
        { status: 400 }
      );
    }

    const versionNum = version || 1;
    // Use generationId (timestamp or counter) to ensure unique collages
    const genId = generationId || Date.now();
    
    console.log(`Generating collage for ${era}, version ${versionNum}, generation ${genId}...`);
    
    const filepath = await generateHeroCollage(era, versionNum, genId);

    return NextResponse.json({
      success: true,
      filepath,
      era,
      version: versionNum,
      message: `Collage generated successfully!`,
    });
  } catch (error: any) {
    console.error('Error generating collage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate collage' },
      { status: 500 }
    );
  }
}
