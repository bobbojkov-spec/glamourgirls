import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const formData = await request.formData();
    const actressId = parseInt(formData.get('actressId') as string);
    const file = formData.get('headshot') as File;

    if (!actressId || isNaN(actressId)) {
      return NextResponse.json({ error: 'Invalid actress ID' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get image metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid image dimensions' }, { status: 400 });
    }

    // Determine folder (check both newpic and securepic, use newpic as default)
    const folders = [
      path.join(process.cwd(), 'public', 'newpic', actressId.toString()),
      path.join(process.cwd(), 'public', 'securepic', actressId.toString()),
    ];

    let targetFolder = folders[0]; // Default to newpic
    
    // Check if securepic folder exists, use it if it does
    try {
      await mkdir(folders[1], { recursive: true });
      const securepicFiles = await readdir(folders[1]).catch(() => []);
      if (securepicFiles.length > 0) {
        targetFolder = folders[1];
      }
    } catch {
      // Use newpic
    }

    // Ensure folder exists
    await mkdir(targetFolder, { recursive: true });

    // Process the headshot with the same crop parameters as existing headshots:
    // 40px from top, 40px from bottom, 25px from left, 28px from right
    const cropLeft = 25;
    const cropTop = 40;
    const cropRight = 28;
    const cropBottom = 40;
    
    // Calculate required minimum dimensions
    const minWidth = 100 + cropLeft + cropRight; // At least 100px wide after crop
    const minHeight = 100 + cropTop + cropBottom; // At least 100px tall after crop
    
    let processedImage = image;
    
    // If image is too small, resize it first to ensure it's large enough for the crop
    if (metadata.width < minWidth || metadata.height < minHeight) {
      // Resize to minimum size (maintain aspect ratio, fit inside, but allow enlarging)
      processedImage = image.resize(minWidth, minHeight, {
        fit: 'inside',
        withoutEnlargement: false, // Allow enlarging if needed
      });
      
      // Get new dimensions after resize
      const resizedMeta = await processedImage.metadata();
      if (!resizedMeta.width || !resizedMeta.height) {
        return NextResponse.json({ error: 'Failed to resize image' }, { status: 500 });
      }
      
      // Calculate crop for resized image
      const width = resizedMeta.width - cropLeft - cropRight;
      const height = resizedMeta.height - cropTop - cropBottom;
      
      // Ensure crop dimensions are valid
      if (width > 0 && height > 0 && cropLeft + width <= resizedMeta.width && cropTop + height <= resizedMeta.height) {
        processedImage = processedImage.extract({
          left: cropLeft,
          top: cropTop,
          width,
          height,
        });
      } else {
        return NextResponse.json({ error: 'Image too small for crop operation' }, { status: 400 });
      }
    } else {
      // Image is large enough, calculate and apply crop
      const width = metadata.width - cropLeft - cropRight;
      const height = metadata.height - cropTop - cropBottom;
      
      if (width <= 0 || height <= 0) {
        return NextResponse.json({ error: 'Invalid crop dimensions' }, { status: 400 });
      }
      
      processedImage = image.extract({
        left: cropLeft,
        top: cropTop,
        width,
        height,
      });
    }

    // Convert to JPEG and save
    const headshotBuffer = await processedImage
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    const headshotPath = path.join(targetFolder, 'headshot.jpg');
    await writeFile(headshotPath, headshotBuffer);

    // Get final dimensions
    const finalMetadata = await sharp(headshotBuffer).metadata();

    return NextResponse.json({
      success: true,
      message: 'Headshot uploaded and processed successfully',
      path: headshotPath.replace(process.cwd() + '/public', ''),
      width: finalMetadata.width,
      height: finalMetadata.height,
    });
  } catch (error) {
    console.error('Error uploading headshot:', error);
    return NextResponse.json(
      { error: 'Failed to upload headshot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

