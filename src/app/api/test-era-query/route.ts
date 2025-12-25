import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const eraValue = 1; // 1930s
    
    // Test 1: Count query (this works in test-db)
    const [count1] = await pool.execute(
      `SELECT COUNT(DISTINCT g.id) as count 
       FROM girls g
       INNER JOIN images i ON g.id = i.girlid
       WHERE g.published = 2 
         AND g.godini = ?
         AND i.mytp = 4
         AND i.path IS NOT NULL 
         AND i.path != ''`,
      [eraValue]
    ) as any[];
    
    // Test 2: Get actual records
    const [records] = await pool.execute(
      `SELECT DISTINCT
         g.id as actressId,
         g.nm as actressName,
         g.slug as actressSlug,
         g.firstname,
         g.familiq,
         g.theirman
       FROM girls g
       INNER JOIN images i ON g.id = i.girlid
       WHERE g.published = 2 
         AND g.godini = ?
         AND i.mytp = 4
         AND i.path IS NOT NULL 
         AND i.path != ''
       ORDER BY g.nm ASC
       LIMIT 5`,
      [eraValue]
    ) as any[];
    
    return NextResponse.json({
      success: true,
      count: count1?.[0]?.count || 0,
      records: records || [],
      recordCount: Array.isArray(records) ? records.length : 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

