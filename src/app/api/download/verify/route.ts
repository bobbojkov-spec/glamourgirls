import { NextRequest, NextResponse } from 'next/server';
import { getOrderByCode, getAllOrders } from '@/lib/orderStore';

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

    return NextResponse.json({
      success: true,
      download: {
        orderId: order.orderId,
        email: order.email,
        items: order.items.map((item: any) => ({
          imageId: item.imageId,
          actressId: item.actressId,
          actressName: item.actressName,
          hqUrl: item.hqUrl,
          imageUrl: item.imageUrl,
          thumbnailUrl: item.thumbnailUrl || item.imageUrl || '',
          width: item.width,
          height: item.height,
          fileSizeMB: item.fileSizeMB,
        })),
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

