import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/orderStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order from store
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Send email using the same endpoint (server-to-server call)
    const baseUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const emailResponse = await fetch(`${baseUrl}/api/checkout/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: order.email,
        orderId: order.orderId,
        downloadCode: order.downloadCode,
        downloadLink: order.downloadLink,
        items: order.items,
        total: order.total,
      }),
    });

    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        emailData,
      });
    } else {
      const error = await emailResponse.json();
      return NextResponse.json(
        { success: false, error: error.error || 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Resend email error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to resend email' },
      { status: 500 }
    );
  }
}

