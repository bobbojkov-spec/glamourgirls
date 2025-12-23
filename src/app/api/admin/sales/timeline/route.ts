import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/orderStore';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // all, month, 6months, year

    const orders = await getAllOrders();
    
    // Calculate date range
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = null; // All time
    }

    // Filter orders by date if needed
    const filteredOrders = startDate
      ? orders.filter(order => new Date(order.createdAt) >= startDate!)
      : orders;

    // Group by date (day)
    const dailyData: Record<string, { date: string; count: number; revenue: number; images: number }> = {};
    
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          count: 0,
          revenue: 0,
          images: 0,
        };
      }
      
      dailyData[date].count += 1;
      dailyData[date].revenue += order.total;
      dailyData[date].images += order.items.length;
    });

    // Convert to array and sort by date
    const timeline = Object.values(dailyData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        date: item.date,
        purchases: item.count,
        revenue: parseFloat(item.revenue.toFixed(2)),
        images: item.images,
      }));

    return NextResponse.json({
      success: true,
      timeline,
      period,
    });
  } catch (error: any) {
    console.error('Error fetching sales timeline:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

