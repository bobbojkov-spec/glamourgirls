import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/orderStore';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const orders = await getAllOrders();
    
    // Sort by date (newest first)
    const sortedOrders = orders.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    // Calculate summary statistics
    const totalBuys = sortedOrders.length;
    const totalImages = sortedOrders.reduce((sum, order) => sum + order.items.length, 0);
    const totalSum = sortedOrders.reduce((sum, order) => sum + order.total, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalBuys,
        totalImages,
        totalSum: parseFloat(totalSum.toFixed(2)),
      },
      orders: sortedOrders.map(order => ({
        orderId: order.orderId,
        email: order.email,
        paymentMethod: order.paymentMethod,
        imageCount: order.items.length,
        total: order.total,
        createdAt: order.createdAt,
        used: order.used,
        downloads: order.downloads || [],
        items: order.items.map(item => ({
          imageId: item.imageId,
          actressName: item.actressName,
          imageUrl: item.imageUrl,
          width: item.width,
          height: item.height,
          fileSizeMB: item.fileSizeMB,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

