import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    // Require at least 3 letters
    if (query.length < 3) {
      return NextResponse.json([]);
    }

    // Search for actresses where firstname or familiq starts with the query
    const searchQuery = `
      SELECT DISTINCT g.id, g.nm, g.firstname, g.familiq, g.slug
      FROM girls g
      WHERE g.published = 2
        AND (
          g.firstname ILIKE ? OR 
          g.familiq ILIKE ?
        )
      ORDER BY g.familiq, g.firstname
      LIMIT 20
    `;

    const searchPattern = `${query}%`;
    const [results] = await pool.execute(searchQuery, [searchPattern, searchPattern]) as any[];

    const suggestions = Array.isArray(results) ? results.map((row: any) => ({
      id: Number(row.id) || 0,
      name: String(row.nm || ''),
      firstName: String(row.firstname || ''),
      lastName: String(row.familiq || ''),
      slug: String(row.slug || ''),
    })) : [];

    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('Error in autocomplete:', error);
    return NextResponse.json(
      { error: 'Failed to fetch autocomplete suggestions' },
      { status: 500 }
    );
  }
}

