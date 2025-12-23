import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // all, month, 6months, year

    // Calculate date range based on period
    let dateFilter = '';
    const now = new Date();
    
    switch (period) {
      case 'month':
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        dateFilter = oneMonthAgo.toISOString().split('T')[0];
        break;
      case '6months':
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        dateFilter = sixMonthsAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        dateFilter = oneYearAgo.toISOString().split('T')[0];
        break;
      default:
        dateFilter = ''; // All time
    }

    // Try to get stats from views_log table, fallback to girls.views column
    let stats: any[] = [];
    
    try {
      // Try views_log table first (more detailed)
      const whereClause = dateFilter 
        ? `AND vl.viewed_at >= '${dateFilter}'`
        : '';
      
      const [rows] = await pool.execute(`
        SELECT 
          g.id,
          g.nm as name,
          g.firstname,
          g.familiq as lastname,
          COUNT(vl.id) as viewCount,
          MAX(vl.viewed_at) as lastViewed
        FROM girls g
        LEFT JOIN views_log vl ON g.id = vl.girlid ${whereClause}
        WHERE g.published = 2
        GROUP BY g.id, g.nm, g.firstname, g.familiq
        HAVING viewCount > 0
        ORDER BY viewCount DESC
        LIMIT 100
      `) as any[];

      stats = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        firstName: row.firstname,
        lastName: row.lastname,
        viewCount: row.viewCount || 0,
        lastViewed: row.lastViewed || null,
      }));
    } catch (error: any) {
      // Fallback to girls.views column if views_log doesn't exist
      if (error.code === 'ER_NO_SUCH_TABLE') {
        const [rows] = await pool.execute(`
          SELECT 
            id,
            nm as name,
            firstname,
            familiq as lastname,
            COALESCE(views, 0) as viewCount
          FROM girls
          WHERE published = 2 AND COALESCE(views, 0) > 0
          ORDER BY views DESC
          LIMIT 100
        `) as any[];

        stats = rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          firstName: row.firstname,
          lastName: row.lastname,
          viewCount: row.viewCount || 0,
          lastViewed: null,
        }));
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      period,
    });
  } catch (error: any) {
    console.error('Error fetching girls stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

