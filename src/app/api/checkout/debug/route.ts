import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/orderStore';

export async function GET(request: NextRequest) {
  try {
    const orders = await getAllOrders();
    return NextResponse.json({
      success: true,
      orderCount: orders.length,
      orders: orders.map(order => ({
        orderId: order.orderId,
        email: order.email,
        downloadCode: order.downloadCode,
        itemCount: order.items.length,
        total: order.total,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get debug info' },
      { status: 500 }
    );
  }
}

