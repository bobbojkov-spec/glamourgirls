import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getOrderByCode, logDownload } from '@/lib/orderStore';
import { fetchFromStorage } from '@/lib/supabase/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl.searchParams;
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

    console.log('Download attempt - imagePath:', imagePath);

    // Fetch image from Supabase Storage
    // HQ images are in the private 'images_raw' bucket, but may also be in public bucket
    let fileBuffer: Buffer | null = null;
    
    if (/^https?:\/\//i.test(imagePath)) {
      // Already a full URL (Supabase Storage URL)
      try {
        const response = await fetch(imagePath);
        if (!response.ok) {
          return NextResponse.json(
            { error: 'Image not found in storage' },
            { status: 404 }
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        console.log('File fetched from URL successfully, size:', fileBuffer.length, 'bytes');
      } catch (fetchError: any) {
        console.error('Error fetching image from URL:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch image from storage' },
          { status: 500 }
        );
      }
    } else {
      // Database path - try images_raw bucket first (HQ images), then public bucket as fallback
      fileBuffer = await fetchFromStorage(imagePath, 'images_raw');
      
      if (!fileBuffer) {
        // Try the public bucket as fallback
        fileBuffer = await fetchFromStorage(imagePath, 'glamourgirls_images');
        
        if (!fileBuffer) {
          return NextResponse.json(
            { error: 'Image not found in storage' },
            { status: 404 }
          );
        }
      }
      console.log('File fetched from storage successfully, size:', fileBuffer.length, 'bytes');
    }
    
    const fileExt = path.extname(imagePath).toLowerCase();
    
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
