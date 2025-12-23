import { NextRequest, NextResponse } from 'next/server';
import { markOrderAsUsed, getOrderByCode } from '@/lib/orderStore';

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Download code is required' },
        { status: 400 }
      );
    }

    const order = await getOrderByCode(code.toUpperCase());
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Invalid download code' },
        { status: 404 }
      );
    }

    // Mark as used
    await markOrderAsUsed(code.toUpperCase());

    return NextResponse.json({
      success: true,
      message: 'Download code marked as used',
    });
  } catch (error) {
    console.error('Error marking code as used:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update code status' },
      { status: 500 }
    );
  }
}

