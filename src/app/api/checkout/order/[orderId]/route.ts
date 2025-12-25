import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orderStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    console.log('Fetching order:', orderId);
    
    const order = await getOrderById(orderId);

    if (!order) {
      console.log('Order not found:', orderId);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('Order found:', order.orderId, 'Items:', order.items.length);

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderId,
        email: order.email,
        downloadCode: order.downloadCode,
        downloadLink: order.downloadLink,
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
        total: order.total,
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

