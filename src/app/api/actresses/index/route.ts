import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Lightweight search index endpoint
 * Returns minimal actress data for client-side search preloading
 * Fields: id, firstname, middlenames, familiq, slug, decade (godini)
 */
export interface ActressSearchIndexItem {
  id: number;
  firstname: string;
  middlenames?: string;
  familiq: string;
  slug: string;
  decade?: string; // '20-30s', '40s', '50s', '60s'
  theirMan?: boolean;
}

export async function GET() {
  try {
    // Simple query - no JOINs, no aggregations, just the essential fields
    const query = `
      SELECT 
        g.id,
        g.firstname,
        g.middlenames,
        g.familiq,
        g.slug,
        g.godini,
        g.theirman
      FROM girls g
      WHERE g.published = 2
      ORDER BY g.familiq, g.firstname
    `;

    const [results] = await pool.execute(query) as any[];

    const eraMap: Record<number, string> = {
      1: '20-30s',
      2: '40s',
      3: '50s',
      4: '60s',
    };

    const index: ActressSearchIndexItem[] = Array.isArray(results) ? results.map((row: any) => {
      // Generate slug if not present
      let slug = row.slug;
      if (!slug) {
        slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }

      return {
        id: Number(row.id) || 0,
        firstname: String(row.firstname || ''),
        middlenames: row.middlenames ? String(row.middlenames) : undefined,
        familiq: String(row.familiq || ''),
        slug: slug,
        decade: eraMap[Number(row.godini)] || undefined,
        theirMan: Boolean(row.theirman) === true,
      };
    }) : [];

    return NextResponse.json(index);
  } catch (error: any) {
    console.error('Database error in /api/actresses/index:', error);
    
    // Return empty array on connection errors to prevent frontend crashes
    // Check for both MySQL and PostgreSQL connection error patterns
    if (error?.message?.includes('Too many connections') || 
        error?.message?.includes('connection') ||
        error?.code === 'ER_CON_COUNT_ERROR' ||
        error?.code === 'PROTOCOL_CONNECTION_LOST' ||
        error?.code === 'ECONNREFUSED') {
      console.warn('Connection error, returning empty index');
      return NextResponse.json([] as ActressSearchIndexItem[]);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch search index', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

