import { NextRequest, NextResponse } from 'next/server';
import { getOrderByCode, logDownload } from '@/lib/orderStore';
import { createSignedUrl } from '@/lib/supabase/storage';

export const runtime = 'nodejs';

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

    console.log('Download attempt - imagePath:', imagePath);

    // Generate signed URL for private bucket (300 seconds = 5 minutes expiration)
    let signedUrl: string | null = null;
    
    if (/^https?:\/\//i.test(imagePath)) {
      // Already a full URL - extract bucket and path to create signed URL
      const urlMatch = imagePath.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+?)(\?|$)/);
      if (urlMatch && urlMatch[2]) {
        const bucket = urlMatch[1]; // Usually 'images_raw' for HQ images
        const filePath = decodeURIComponent(urlMatch[2]);
        
        // Create signed URL for private bucket
        signedUrl = await createSignedUrl(filePath, bucket, 300);
      } else {
        // If we can't parse it, try to create signed URL from the path directly
        // This handles cases where the URL format is different
        signedUrl = await createSignedUrl(imagePath, 'images_raw', 300);
      }
    } else {
      // Database path - create signed URL for private bucket
      signedUrl = await createSignedUrl(imagePath, 'images_raw', 300);
    }
    
    if (!signedUrl) {
      console.error('Failed to create signed URL for image path:', imagePath);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    console.log('Signed URL generated successfully');

    // Return signed URL instead of streaming the file
    return NextResponse.json({
      url: signedUrl
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
