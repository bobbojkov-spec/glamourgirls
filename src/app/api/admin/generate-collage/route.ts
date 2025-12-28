import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import pool from '@/lib/db';
import path from 'path';
import { requireAdminApi } from '@/app/api/admin/_auth';
import * as collageStorage from '@/lib/collage-storage';
import { fetchFromStorage, uploadToStorage, getStorageUrl } from '@/lib/supabase/storage';

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
async function generateHeroCollage(era: string, version: number = 1, generationId: number = Date.now()): Promise<{ storagePath: string; publicUrl: string | null; fileSize: number }> {
  const eraValue = ERA_MAP[era];
  if (!eraValue) {
    throw new Error(`Invalid era: ${era}. Valid eras: 1930s, 1940s, 1950s, 1960s`);
  }

  console.log(`\n🎨 Generating hero collage for ${era} (version ${version})...`);

  // Get random gallery images for this era - one photo per girl to ensure variety
  // Using a subquery with ROW_NUMBER to get one random image per girl
  const [images] = await pool.execute(
    `SELECT imagePath, width, height
     FROM (
       SELECT 
         i.path as imagePath,
         i.width,
         i.height,
         ROW_NUMBER() OVER (PARTITION BY i.girlid ORDER BY RANDOM()) as rn
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
     ) ranked
     WHERE rn = 1
     ORDER BY RANDOM()
     LIMIT 40`,
    [eraValue]
  ) as any[];

  if (!Array.isArray(images) || images.length < 20) {
    throw new Error(`Not enough images found for era ${era}. Found: ${images?.length || 0}, need at least 20`);
  }

  console.log(`📸 Found ${images.length} images for collage`);
  
  // Log first few image paths for debugging
  if (images.length > 0) {
    console.log(`📸 Sample image paths (first 3):`);
    for (let i = 0; i < Math.min(3, images.length); i++) {
      const img = images[i];
      const pathRaw = img?.imagePath || img?.imagepath || img?.path;
      console.log(`  ${i + 1}. ${pathRaw}`);
    }
  }

  // Hero dimensions: 1400x650px
  const HERO_WIDTH = 1400;
  const HERO_HEIGHT = 650;
  const CANVAS_WIDTH = HERO_WIDTH;
  const CANVAS_HEIGHT = HERO_HEIGHT;

  // Create base canvas with background color #c3b489 (rgb(195, 180, 137))
  const bgColor = { r: 195, g: 180, b: 137 };

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
  
  // Track placed images for overlap detection
  interface PlacedImage {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  }
  const placedImages: PlacedImage[] = [];
  
  // Helper function to calculate overlap percentage between two rectangles
  const calculateOverlap = (img1: PlacedImage, img2: PlacedImage): number => {
    // Calculate intersection rectangle
    const left = Math.max(img1.x, img2.x);
    const right = Math.min(img1.x + img1.width, img2.x + img2.width);
    const top = Math.max(img1.y, img2.y);
    const bottom = Math.min(img1.y + img1.height, img2.y + img2.height);
    
    if (left >= right || top >= bottom) return 0; // No overlap
    
    const overlapArea = (right - left) * (bottom - top);
    const smallerArea = Math.min(img1.width * img1.height, img2.width * img2.height);
    
    return overlapArea / smallerArea; // Return as percentage of smaller image
  };
  
  // Helper function to check if position is valid (allow more overlap to fill canvas)
  const isValidPosition = (newImg: PlacedImage, maxOverlap: number = 0.35, isSmallImage: boolean = false): boolean => {
    for (const placed of placedImages) {
      const overlap = calculateOverlap(newImg, placed);
      if (overlap > maxOverlap) {
        return false;
      }
      // Also check center distance - allow much more overlap to fill canvas
      const centerDistance = Math.sqrt(
        Math.pow(newImg.centerX - placed.centerX, 2) + 
        Math.pow(newImg.centerY - placed.centerY, 2)
      );
      // For smaller images (filling gaps), allow even closer placement
      const minCenterDistance = isSmallImage
        ? Math.min(newImg.width, newImg.height, placed.width, placed.height) * 0.35 // Small images can be closer
        : Math.min(newImg.width, newImg.height, placed.width, placed.height) * 0.40; // Larger images: 40%
      if (centerDistance < minCenterDistance) {
        return false;
      }
    }
    return true;
  };

  // Load and prepare images - use layered approach: big -> medium -> small
  // Process images in size tiers to fill canvas better
  const maxToProcess = Math.min(images.length, 30);
  
  // Separate images into processing order: we'll process all, but in size tiers
  for (let i = 0; i < maxToProcess; i++) {
    const img = images[i];
    
    // Get imagePath - handle both camelCase and lowercase field names (PostgreSQL case sensitivity)
    const imagePathRaw = img?.imagePath || img?.imagepath || img?.path;
    
    // Skip if imagePath is missing or invalid
    if (!imagePathRaw || typeof imagePathRaw !== 'string' || imagePathRaw.trim() === '') {
      console.warn(`  ⚠️  Skipped image ${i + 1}: invalid or missing imagePath`);
      continue;
    }
    
    // Fetch from Supabase Storage only
    let imageBuffer: Buffer | null = null;
    
    try {
      // Fetch from Supabase Storage
      imageBuffer = await fetchFromStorage(imagePathRaw, 'glamourgirls_images');
      
      if (!imageBuffer) {
        if (i < 3) {
          console.log(`  ⚠️  Image not found in Supabase Storage: ${imagePathRaw}`);
        }
        throw new Error(`Image not found in Supabase Storage: ${imagePathRaw}`);
      }
      
      if (i < 3) {
        console.log(`  ✅ Fetched from Supabase Storage: ${imagePathRaw}`);
      }
      
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
      
      // Layered size approach: bigger images first, then smaller ones fill gaps
      // Tier 1 (first 5-6): Large images 250-350px
      // Tier 2 (next 8-10): Medium images 150-220px  
      // Tier 3 (rest): Small images 100-150px
      let baseSize: number;
      if (i < 6) {
        // First 6 images: Large
        baseSize = 250 + seededRandom(1) * 100; // 250-350px
      } else if (i < 16) {
        // Next 10 images: Medium
        baseSize = 150 + seededRandom(1) * 70; // 150-220px
      } else {
        // Rest: Small to fill gaps
        baseSize = 100 + seededRandom(1) * 50; // 100-150px
      }
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
      
      // Random rotation (-60 to +60 degrees for more natural "thrown on floor" effect)
      const rotation = -60 + seededRandom(4) * 120;
      
      // Random scale variation (0.85 to 1.15)
      const scale = 0.85 + seededRandom(5) * 0.3;
      
      // Resize, convert to PNG with transparency, rotate, then add rounded corners
      // Step 1: Resize first
      const resizedImage = await sharp(imageBuffer)
        .resize(Math.round(collageWidth * scale), Math.round(collageHeight * scale), {
          fit: 'cover',
          position: 'center',
        })
        .toBuffer();

      // Step 2: Convert to PNG with alpha channel BEFORE rotation to ensure transparency
      const imageWithAlpha = await sharp(resizedImage)
        .ensureAlpha()
        .png()
        .toBuffer();

      // Step 3: Rotate with fully transparent background (now that we have alpha channel)
      const rotatedImage = await sharp(imageWithAlpha)
        .rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      // Step 4: Get dimensions AFTER rotation (bounding box changes)
      const imageMeta = await sharp(rotatedImage).metadata();
      const imgWidth = imageMeta.width || collageWidth;
      const imgHeight = imageMeta.height || collageHeight;

      // Step 5: Add 6px rounded corners using SVG mask (NO black background)
      // Create rounded rectangle mask
      const maskSvg = Buffer.from(`
        <svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="${imgWidth}" height="${imgHeight}" rx="6" ry="6" fill="white"/>
        </svg>
      `);
      
      // Apply mask to create rounded corners - dest-in keeps only where mask is white
      const finalBuffer = await sharp(rotatedImage)
        .composite([{
          input: maskSvg,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();

      // Try to find a valid position with max 10-15% overlap
      let x: number, y: number;
      let attempts = 0;
      const maxAttempts = 50;
      let positionFound = false;
      
      while (attempts < maxAttempts && !positionFound) {
        // Random position - evenly distributed across entire canvas (no center bias)
        // Allow images to go slightly outside bounds for "thrown" effect
        const padding = Math.min(imgWidth, imgHeight) * 0.2; // Allow 20% to go outside
        // Even distribution across entire canvas - no center bias
        x = -padding + seededRandom(2 + attempts) * (CANVAS_WIDTH + padding * 2);
        y = -padding + seededRandom(3 + attempts) * (CANVAS_HEIGHT + padding * 2);
        
        const centerX = x + imgWidth / 2;
        const centerY = y + imgHeight / 2;
        
        const newImg: PlacedImage = {
          x: Math.round(x),
          y: Math.round(y),
          width: imgWidth,
          height: imgHeight,
          centerX,
          centerY,
        };
        
        // Check if position is valid - allow much more overlap to fill canvas (25-35%)
        // For smaller images (i >= 16), allow even more overlap to fill gaps
        const isSmallImage = i >= 16;
        const maxOverlap = isSmallImage 
          ? (attempts < 30 ? 0.30 : (attempts < 50 ? 0.35 : 0.40)) // Small images: 30-40% overlap
          : (attempts < 30 ? 0.25 : (attempts < 50 ? 0.30 : 0.35)); // Larger images: 25-35% overlap
        if (isValidPosition(newImg, maxOverlap, isSmallImage)) {
          positionFound = true;
          placedImages.push(newImg);
          
          imageBuffers.push({
            buffer: finalBuffer,
            width: imgWidth,
            height: imgHeight,
            x: Math.round(x),
            y: Math.round(y),
            rotation: rotation,
            scale: scale,
          });
        }
        
        attempts++;
      }
      
      if (!positionFound) {
        console.warn(`  ⚠️  Could not find valid position for image ${i + 1} after ${maxAttempts} attempts, skipping`);
        continue;
      }

      console.log(`  ✓ Processed image ${i + 1}/${maxToProcess} (size tier: ${i < 6 ? 'large' : (i < 16 ? 'medium' : 'small')})`);
    } catch (error: any) {
      console.warn(`  ⚠️  Skipped image ${i + 1}: ${error.message}`);
      continue;
    }
  }

  if (imageBuffers.length < 15) {
    throw new Error(`Not enough valid images processed. Got ${imageBuffers.length} visible, need at least 15`);
  }
  
  console.log(`📊 Final count: ${imageBuffers.length} images visible in canvas`);
  console.log(`   - Large (250-350px): ${imageBuffers.filter((_, idx) => idx < 6).length}`);
  console.log(`   - Medium (150-220px): ${imageBuffers.filter((_, idx) => idx >= 6 && idx < 16).length}`);
  console.log(`   - Small (100-150px): ${imageBuffers.filter((_, idx) => idx >= 16).length}`);

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

  // Upload to Supabase Storage
  const filename = `hero-collage-${era}-v${version}.jpg`;
  const storagePath = `collages/${filename}`;
  
  console.log(`📤 Uploading collage to Supabase Storage: ${storagePath}`);
  const uploadedPath = await uploadToStorage(storagePath, collageBuffer, 'glamourgirls_images', 'image/jpeg');
  
  if (!uploadedPath) {
    throw new Error('Failed to upload collage to Supabase Storage');
  }

  // Get the public URL for the collage
  const publicUrl = getStorageUrl(uploadedPath, 'glamourgirls_images');
  
  console.log(`✅ Collage uploaded to Supabase Storage: ${uploadedPath}`);
  console.log(`   Public URL: ${publicUrl}`);
  console.log(`   Size: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}px`);
  console.log(`   Images used: ${imageBuffers.length}`);
  console.log(`   File size: ${(collageBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Return object with both path and buffer size for metadata
  return {
    storagePath: `/${uploadedPath}`,
    publicUrl: publicUrl || `/${uploadedPath}`,
    fileSize: collageBuffer.length,
  };
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

    // Auto-assign version number: find max version for this era and increment
    const existingCollages = await collageStorage.getCollagesByEra(era);
    const maxVersion = existingCollages.length > 0 
      ? Math.max(...existingCollages.map(c => c.version))
      : 0;
    const versionNum = version !== undefined ? version : (maxVersion + 1);
    
    // Use generationId (must be provided and unique) to ensure different collages
    // If not provided, use timestamp with random component
    const genId = generationId || (Date.now() + Math.floor(Math.random() * 1000000));
    
    console.log(`Generating collage for ${era}, version ${versionNum}, generation ${genId}...`);
    
    const result = await generateHeroCollage(era, versionNum, genId);
    const filename = path.basename(result.storagePath);

    // Save metadata (default to active for new collages)
    // Store the public URL for easy access
    // Handle null case: use storagePath as fallback if publicUrl is null
    const filepath = result.publicUrl || result.storagePath;
    
    // Save with active: false by default - user will select which ones to use
    const active = body.active !== undefined ? body.active : false;
    
    const metadata = await collageStorage.addCollage({
      era,
      version: versionNum,
      filepath, // Store public URL or fallback to storagePath
      filename,
      active: active,
      fileSize: result.fileSize,
    });

    return NextResponse.json({
      success: true,
      filepath: result.publicUrl,
      storagePath: result.storagePath,
      era,
      version: versionNum,
      id: metadata.id,
      message: `Collage generated and uploaded to Supabase Storage successfully!`,
    });
  } catch (error: any) {
    console.error('Error generating collage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate collage' },
      { status: 500 }
    );
  }
}
