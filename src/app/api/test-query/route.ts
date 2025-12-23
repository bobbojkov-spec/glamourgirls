/**
 * TEST QUERY API - PERMANENT TESTING TOOL
 * 
 * This API route is kept for ongoing database query testing.
 * It provides detailed logging and simplified queries for debugging.
 * 
 * Endpoint: /api/test-query?keyword=...
 */

import { NextResponse } from 'next/server';
import pool, { resetPool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';

    // Step 1: Test basic connection with simple query
    let connectionTestPassed = false;
    let connectionError: any = null;
    
    try {
      console.log('[TEST] Attempting to get pool...');
      const testPool = pool;
      console.log('[TEST] Pool obtained, executing test query...');
      
      const [testResult] = await testPool.execute(
        `SELECT COUNT(*) as total FROM girls WHERE published = 2`
      ) as any[];
      const total = testResult?.[0]?.total || 0;
      console.log(`[TEST] Total published actresses: ${total}`);
      connectionTestPassed = true;
    } catch (testError: any) {
      connectionError = {
        message: testError.message,
        code: testError.code,
        errno: testError.errno,
        sqlState: testError.sqlState,
        sqlMessage: testError.sqlMessage,
      };
      console.error('[TEST] Connection test failed:', testError);
      console.error('[TEST] Error details:', JSON.stringify(connectionError, null, 2));
      
      // If we hit "too many connections", reset the pool and suggest waiting
      if (testError.code === 'ER_CON_COUNT_ERROR') {
        console.error('[TEST] Too many connections - resetting pool...');
        resetPool();
        return NextResponse.json(
          {
            error: 'Database connection failed - too many connections',
            details: connectionError,
            suggestion: 'Connection pool has been reset. Please wait 5-10 seconds and try again. The pool is now limited to 1 connection to prevent this issue. If this persists, restart the Next.js server.',
            action: 'Pool reset attempted',
          },
          { status: 500 }
        );
      }
      
      // Return detailed error info
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: connectionError,
          suggestion: 'Check if MySQL server is running and connection pool is not exhausted',
        },
        { status: 500 }
      );
    }

    if (!connectionTestPassed) {
      return NextResponse.json(
        { error: 'Connection test failed, cannot proceed' },
        { status: 500 }
      );
    }

    // Step 2: Build the search query - start with simplest possible
    console.log('[TEST] Building query...');
    
    // First, try the simplest query possible - no JOIN, no GROUP BY
    let query = `
      SELECT id, nm, firstname, familiq, godini, isnew, isnewpix, slug
      FROM girls
      WHERE published = 2
    `;

    const params: any[] = [];

    // Step 3: Add keyword search
    if (keyword) {
      query += ` AND (nm LIKE ? OR firstname LIKE ? OR familiq LIKE ?)`;
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam, keywordParam);
    }

    query += ` ORDER BY familiq, firstname LIMIT 20`;

    console.log('[TEST] Query:', query);
    console.log('[TEST] Params:', params);

    // Step 4: Execute query
    console.log('[TEST] Executing query...');
    const [results] = await pool.execute(query, params) as any[];

    console.log(`[TEST] Query returned ${Array.isArray(results) ? results.length : 0} results`);

    // Step 5: Map results
    console.log(`[TEST] Query returned ${Array.isArray(results) ? results.length : 0} rows`);
    
    const eraMap: Record<number, string> = {
      1: '20-30s',
      2: '40s',
      3: '50s',
      4: '60s',
    };

    const actresses = Array.isArray(results)
      ? results.map((row: any) => {
          let slug = row.slug;
          if (!slug) {
            slug = `${row.firstname || ''}-${row.familiq || ''}`
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '');
          }

          return {
            id: Number(row.id) || 0,
            name: String(row.nm || ''),
            firstName: String(row.firstname || ''),
            lastName: String(row.familiq || ''),
            slug: slug,
            years: eraMap[Number(row.godini)] || '50s',
            photoCount: 0, // Simplified - no JOIN for now
            hqPhotoCount: 0,
            isNew: Number(row.isnew) === 2,
            hasNewPhotos: Number(row.isnewpix) === 2,
          };
        })
      : [];

    console.log(`[TEST] Mapped ${actresses.length} actresses`);
    return NextResponse.json(actresses);
  } catch (error: any) {
    console.error('[TEST] Error:', error);
    
    // If we hit "too many connections", reset the pool
    if (error.code === 'ER_CON_COUNT_ERROR') {
      console.error('[TEST] Too many connections - resetting pool...');
      resetPool();
      return NextResponse.json(
        {
          error: 'Query failed - too many connections',
          details: error.message,
          code: error.code,
          suggestion: 'Connection pool has been reset. Please wait a few seconds and try again.',
          action: 'Pool reset attempted',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Query failed',
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

