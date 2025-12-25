import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test 1: Basic connection
    const [test1] = await pool.execute('SELECT 1 as test') as any[];
    
    // Test 2: Count all girls
    const [test2] = await pool.execute('SELECT COUNT(*) as count FROM girls') as any[];
    const totalGirls = test2?.[0]?.count || 0;
    
    // Test 3: Count published girls
    const [test3] = await pool.execute('SELECT COUNT(*) as count FROM girls WHERE published = 2') as any[];
    const publishedGirls = test3?.[0]?.count || 0;
    
    // Test 4: Count girls with godini = 1
    const [test4] = await pool.execute('SELECT COUNT(*) as count FROM girls WHERE published = 2 AND godini = 1') as any[];
    const era1Girls = test4?.[0]?.count || 0;
    
    // Test 5: Count girls with gallery images
    const [test5] = await pool.execute(`
      SELECT COUNT(DISTINCT g.id) as count 
      FROM girls g
      INNER JOIN images i ON g.id = i.girlid
      WHERE g.published = 2 
        AND i.mytp = 4
        AND i.path IS NOT NULL 
        AND i.path != ''
    `) as any[];
    const girlsWithGallery = test5?.[0]?.count || 0;
    
    // Test 6: Count girls with godini = 1 and gallery images
    const [test6] = await pool.execute(`
      SELECT COUNT(DISTINCT g.id) as count 
      FROM girls g
      INNER JOIN images i ON g.id = i.girlid
      WHERE g.published = 2 
        AND g.godini = 1
        AND i.mytp = 4
        AND i.path IS NOT NULL 
        AND i.path != ''
    `) as any[];
    const era1WithGallery = test6?.[0]?.count || 0;
    
    // Test 7: Get sample godini values
    const [test7] = await pool.execute(`
      SELECT DISTINCT godini, COUNT(*) as count 
      FROM girls 
      WHERE published = 2 
      GROUP BY godini 
      ORDER BY godini
    `) as any[];
    
    return NextResponse.json({
      success: true,
      tests: {
        connection: test1?.[0]?.test === 1 ? 'OK' : 'FAILED',
        totalGirls,
        publishedGirls,
        era1Girls,
        girlsWithGallery,
        era1WithGallery,
        availableGodiniValues: test7 || [],
      },
    });
  } catch (error: any) {
    console.error('[Test DB] Error:', error);
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

