import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getOrderByCode, logDownload } from '@/lib/orderStore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const imageId = searchParams.get('imageId');
    const hqUrl = searchParams.get('hqUrl'); // Optional: allow direct hqUrl for fallback

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    let imagePath: string | null = null;
    let imageItem: any = null;

    // If hqUrl is provided directly, use it (for client-side verified downloads)
    // BUT only if code is not provided or code is valid and not used
    if (hqUrl) {
        // If code is provided, verify it's not used
        if (code) {
          let order = await getOrderByCode(code);
          if (order) {
            if (order.used) {
              return NextResponse.json(
                { error: 'This download code has already been used. Please contact support if you need assistance.' },
                { status: 403 }
              );
            }
            // Log the download - this will automatically mark code as used if all images are downloaded
            const wasMarkedAsUsed = await logDownload(order.orderId, imageId);
            if (wasMarkedAsUsed) {
              // Reload order to get fresh data
              const updatedOrder = await getOrderByCode(code, true);
              if (updatedOrder) {
                order = updatedOrder;
              }
            }
            
            imageItem = order.items.find((item: any) => item.imageId === imageId);
          }
        }
      imagePath = hqUrl;
    } else if (code) {
      // Verify the download code
      let order = await getOrderByCode(code);
      if (!order) {
        console.log('Order not found for code:', code);
        return NextResponse.json(
          { error: 'Invalid download code' },
          { status: 403 }
        );
      }

      // Check if code has already been used
      if (order.used) {
        return NextResponse.json(
          { error: 'This download code has already been used. Please contact support if you need assistance.' },
          { status: 403 }
        );
      }

      // Find the image in the order
      imageItem = order.items.find((item: any) => item.imageId === imageId);
      if (!imageItem) {
        return NextResponse.json(
          { error: 'Image not found in order' },
          { status: 404 }
        );
      }

      // Get the HQ image path - MUST use hqUrl, never fallback to imageUrl (thumbnail)
      if (!imageItem.hqUrl) {
        return NextResponse.json(
          { error: 'HQ image URL not found in order' },
          { status: 404 }
        );
      }
      imagePath = imageItem.hqUrl;
      
      // Log the download - this will automatically mark code as used if all images are downloaded
      // Refresh order from file after logging to get updated status
      const wasMarkedAsUsed = await logDownload(order.orderId, imageId);
      if (wasMarkedAsUsed) {
        // Reload order to get fresh data
        const updatedOrder = await getOrderByCode(code, true);
        if (updatedOrder) {
          order = updatedOrder;
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Download code or HQ image URL is required' },
        { status: 400 }
      );
    }

    if (!imagePath) {
      return NextResponse.json(
        { error: 'Image path not found' },
        { status: 404 }
      );
    }

    // Construct full file path
    // Paths in database are like "/newpic/3/image.jpg" or "/securepic/3/image.jpg"
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const fullPath = path.join(process.cwd(), 'public', cleanPath);

    console.log('Download attempt - imagePath:', imagePath);
    console.log('Download attempt - cleanPath:', cleanPath);
    console.log('Download attempt - fullPath:', fullPath);

    // Check if file exists
    try {
      await fs.access(fullPath);
      console.log('File exists, proceeding with download');
    } catch (fileError: any) {
      console.error('File access error:', fileError.message);
      console.error('Attempted path:', fullPath);
      return NextResponse.json(
        { error: `Image file not found on server: ${cleanPath}` },
        { status: 404 }
      );
    }

    // Read the file
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(fullPath);
      console.log('File read successfully, size:', fileBuffer.length, 'bytes');
    } catch (readError: any) {
      console.error('File read error:', readError.message);
      return NextResponse.json(
        { error: 'Failed to read image file from server' },
        { status: 500 }
      );
    }
    const fileExt = path.extname(fullPath).toLowerCase();
    
    // Determine content type
    const contentType = 
      fileExt === '.jpg' || fileExt === '.jpeg' ? 'image/jpeg' :
      fileExt === '.png' ? 'image/png' :
      fileExt === '.gif' ? 'image/gif' :
      'application/octet-stream';

    // Generate filename - get actress name from order item if available, or use generic
    const actressName = imageItem?.actressName || 'Image';
    const filename = `${actressName.replace(/\s+/g, '_')}_HQ_${imageId}${fileExt}`;

    // Return the file with proper headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    console.error('Error details:', error?.message, error?.stack);
    return NextResponse.json(
      { error: error?.message || 'Failed to download image' },
      { status: 500 }
    );
  }
}

