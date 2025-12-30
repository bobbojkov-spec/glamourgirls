import { NextRequest, NextResponse } from 'next/server';
import { getOrderByCode, getAllOrders } from '@/lib/orderStore';
import { createSignedUrl } from '@/lib/supabase/storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Download code is required' },
        { status: 400 }
      );
    }

    console.log('Verifying download code:', code);
    
    // Debug: Show all orders
    const allOrders = await getAllOrders();
    console.log('Total orders in store:', allOrders.length);
    console.log('All download codes:', allOrders.map(o => o.downloadCode));
    console.log('All order IDs:', allOrders.map(o => o.orderId));
    
    // Find order by download code - force refresh to get latest status
    const order = await getOrderByCode(code, true);

    if (!order) {
      console.log('Code not found. Available codes:', allOrders.map(o => o.downloadCode));
      console.log('Store size:', allOrders.length);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid download code',
          debug: {
            codeProvided: code,
            availableCodes: allOrders.map(o => o.downloadCode),
            orderCount: allOrders.length,
          }
        },
        { status: 404 }
      );
    }
    
    console.log('Order found for code:', code, 'OrderId:', order.orderId, 'Items:', order.items.length);

    // Generate signed URLs for thumbnails (60 second expiration for previews)
    const itemsWithSignedUrls = await Promise.all(
      order.items.map(async (item: any) => {
        let thumbnailSignedUrl = '';
        const thumbnailPath = item.thumbnailUrl || item.imageUrl || '';
        
        if (thumbnailPath) {
          // Check if it's already a full URL (public bucket)
          if (thumbnailPath.startsWith('http://') || thumbnailPath.startsWith('https://')) {
            // If it's a public URL, check if it's actually accessible
            // If not, we'll need to extract the path and create a signed URL
            // For now, try to extract bucket and path if it's a Supabase URL
            const urlMatch = thumbnailPath.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/);
            if (urlMatch) {
              // It's a public URL, use it directly
              thumbnailSignedUrl = thumbnailPath;
            } else {
              // Might be a signed URL already, or we need to extract path
              const signedUrlMatch = thumbnailPath.match(/\/storage\/v1\/object\/sign\/([^\/]+)\/(.+?)(\?|$)/);
              if (signedUrlMatch) {
                // Already a signed URL
                thumbnailSignedUrl = thumbnailPath;
              } else {
                // Try to create signed URL from the full URL
                thumbnailSignedUrl = await createSignedUrl(thumbnailPath, 'glamourgirls_images', 60) || thumbnailPath;
              }
            }
          } else {
            // Database path - create signed URL for private bucket
            thumbnailSignedUrl = await createSignedUrl(thumbnailPath, 'glamourgirls_images', 60) || '';
          }
        }

        return {
          imageId: item.imageId,
          actressId: item.actressId,
          actressName: item.actressName,
          hqUrl: item.hqUrl,
          imageUrl: item.imageUrl,
          thumbnailUrl: thumbnailSignedUrl || item.thumbnailUrl || item.imageUrl || '',
          width: item.width,
          height: item.height,
          fileSizeMB: item.fileSizeMB,
        };
      })
    );

    return NextResponse.json({
      success: true,
      download: {
        orderId: order.orderId,
        email: order.email,
        items: itemsWithSignedUrls,
        code: order.downloadCode,
        used: order.used,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}

