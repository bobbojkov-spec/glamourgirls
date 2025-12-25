import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPool } from '@/lib/db';
import { requireAdminApi } from '@/app/api/admin/_auth';

// GET: Fetch actresses with featured status and first gallery image (with optional filtering)
export async function GET(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    // First check if columns exist by querying information_schema
    let columnsExist = false;
    try {
      const [columnCheck] = await pool.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'girls' 
          AND column_name IN ('is_featured', 'featured_order')
        LIMIT 2
      `) as any[];
      
      columnsExist = Array.isArray(columnCheck) && columnCheck.length === 2;
    } catch (checkError: any) {
      console.error('Error checking for columns:', checkError);
      // If we can't check, assume they don't exist to be safe
      columnsExist = false;
    }

    if (!columnsExist) {
      console.error('Featured actresses columns missing - migration required');
      return NextResponse.json(
        { 
          error: 'Database migration required', 
          details: 'The is_featured and featured_order columns do not exist in the girls table. Please run the migration script: scripts/add-featured-actresses-columns.sql',
          migrationScript: 'scripts/add-featured-actresses-columns.sql',
          hint: 'Run: psql $DATABASE_URL -f scripts/add-featured-actresses-columns.sql'
        },
        { status: 500 }
      );
    }

    // Get filter parameters from query string
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const decade = searchParams.get('decade') || 'all';
    const featuredOnly = searchParams.get('featuredOnly') === 'true';

    // Build query with filters
    // First try to find headshot (mytp = 3 or path contains 'headshot'), then fallback to portrait gallery image
    let query = `
      SELECT 
        g.id,
        g.nm as name,
        g.firstname,
        g.familiq as lastname,
        g.is_featured,
        g.featured_order,
        g.godini,
        COALESCE(
          (SELECT i2.path 
           FROM images i2 
           WHERE i2.girlid = g.id 
             AND i2.path IS NOT NULL 
             AND i2.path != ''
             AND (
               i2.path ILIKE '%headshot.jpg%'
               OR i2.path ILIKE '%headshot.jpeg%'
               OR i2.path ILIKE '%headshot.png%'
               OR i2.mytp = 3
             )
           ORDER BY 
             CASE 
               WHEN i2.path ILIKE '%headshot.jpg%' THEN 1
               WHEN i2.path ILIKE '%headshot.jpeg%' THEN 2
               WHEN i2.path ILIKE '%headshot.png%' THEN 3
               ELSE 4
             END,
             i2.id ASC 
           LIMIT 1),
          (SELECT i3.path 
           FROM images i3 
           WHERE i3.girlid = g.id 
             AND i3.mytp = 4 
             AND i3.path IS NOT NULL 
             AND i3.path != ''
             AND i3.width > 0 
             AND i3.height > 0
             AND i3.height > i3.width
           ORDER BY i3.id ASC 
           LIMIT 1)
        ) as gallery_image_path
      FROM girls g
      WHERE g.published = 2
        AND (g.theirman IS NULL OR g.theirman = false)
    `;

    const params: any[] = [];

    // If no filters, show only featured actresses by default
    if (featuredOnly || (!keyword.trim() && decade === 'all')) {
      query += ` AND g.is_featured = true`;
    }

    // Filter by decade (godini: 1=20-30s, 2=40s, 3=50s, 4=60s)
    if (decade && decade !== 'all') {
      const eraMap: Record<string, number> = {
        '20-30s': 1,
        '40s': 2,
        '50s': 3,
        '60s': 4,
      };
      if (eraMap[decade]) {
        query += ` AND g.godini = ?`;
        params.push(eraMap[decade]);
      }
    }

    // Filter by keyword (search in name, firstname, familiq)
    if (keyword && keyword.trim().length > 0) {
      const keywordLower = keyword.toLowerCase().trim();
      query += ` AND (
        LOWER(g.nm) LIKE ? OR
        LOWER(g.firstname) LIKE ? OR
        LOWER(g.familiq) LIKE ?
      )`;
      const keywordPattern = `%${keywordLower}%`;
      params.push(keywordPattern, keywordPattern, keywordPattern);
    }

    query += `
      ORDER BY 
        g.is_featured DESC,
        g.featured_order ASC NULLS LAST,
        g.familiq ASC,
        g.firstname ASC
    `;

    const [results] = await pool.execute(query, params) as any[];

    // Format results and add preview image URL (always populated)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const actresses = (Array.isArray(results) ? results : []).map((row: any) => {
      let previewImageUrl: string;
      if (row.gallery_image_path) {
        const cleanPath = row.gallery_image_path.startsWith('/') 
          ? row.gallery_image_path.slice(1) 
          : row.gallery_image_path;
        previewImageUrl = supabaseUrl 
          ? `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${cleanPath}`
          : '/images/placeholder-portrait.png';
      } else {
        previewImageUrl = '/images/placeholder-portrait.png';
      }

      return {
        id: Number(row.id) || 0,
        name: String(row.name || ''),
        firstName: String(row.firstname || ''),
        lastName: String(row.lastname || ''),
        slug: String(row.slug || ''),
        isFeatured: Boolean(row.is_featured) === true,
        featuredOrder: row.featured_order ? Number(row.featured_order) : null,
        previewImageUrl: previewImageUrl,
      };
    });

    // Count featured actresses in the filtered results
    const featuredCount = actresses.filter(a => a.isFeatured).length;

    return NextResponse.json({
      actresses,
      featuredCount, // Count from filtered results
      totalCount: actresses.length, // Total filtered results
      maxFeatured: 8,
    });
  } catch (error: any) {
    console.error('Error fetching featured actresses:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      name: error?.name,
    });
    
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || '';
    const errorDetail = error?.detail || '';
    const errorHint = error?.hint || '';
    
    // Check if it's a column missing error
    if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database columns missing', 
          details: 'The is_featured and featured_order columns do not exist. Please run the migration script: scripts/add-featured-actresses-columns.sql',
          sqlError: errorMessage,
          code: errorCode,
          hint: errorHint
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch actresses', 
        details: errorMessage,
        code: errorCode,
        detail: errorDetail,
        hint: errorHint,
        fullError: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// POST: Update featured status for multiple actresses
export async function POST(request: NextRequest) {
  const { error } = await requireAdminApi(request);
  if (error) return error;

  try {
    // First check if columns exist by querying information_schema
    let columnsExist = false;
    try {
      const [columnCheck] = await pool.execute(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'girls' 
          AND column_name IN ('is_featured', 'featured_order')
        LIMIT 2
      `) as any[];
      
      columnsExist = Array.isArray(columnCheck) && columnCheck.length === 2;
    } catch (checkError: any) {
      console.error('Error checking for columns:', checkError);
      columnsExist = false;
    }

    if (!columnsExist) {
      console.error('Featured actresses columns missing - migration required');
      return NextResponse.json(
        { 
          error: 'Database migration required', 
          details: 'The is_featured and featured_order columns do not exist in the girls table. Please run the migration script: scripts/add-featured-actresses-columns.sql',
          migrationScript: 'scripts/add-featured-actresses-columns.sql',
          hint: 'Run: psql $DATABASE_URL -f scripts/add-featured-actresses-columns.sql'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { updates } = body; // Array of { id, isFeatured, featuredOrder }

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid request: updates must be an array' },
        { status: 400 }
      );
    }

    // Validate: maximum 8 featured actresses
    const featuredUpdates = updates.filter((u: any) => u.isFeatured === true);
    const featuredCount = featuredUpdates.length;
    if (featuredCount > 8) {
      return NextResponse.json(
        { error: `Cannot feature more than 8 actresses. Currently trying to feature ${featuredCount}.` },
        { status: 400 }
      );
    }

    // Validate: all featured actresses must have a featuredOrder
    const featuredWithoutOrder = featuredUpdates.filter((u: any) => u.featuredOrder === null || u.featuredOrder === undefined);
    if (featuredWithoutOrder.length > 0) {
      return NextResponse.json(
        { error: `All featured actresses must have a position (1-8). ${featuredWithoutOrder.length} featured actress(es) are missing a position.` },
        { status: 400 }
      );
    }

    // Validate: featured_order must be unique and between 1-8
    const featuredOrders = featuredUpdates
      .map((u: any) => u.featuredOrder)
      .filter((o: any) => o !== null && o !== undefined);
    
    const uniqueOrders = new Set(featuredOrders);
    if (featuredOrders.length !== uniqueOrders.size) {
      return NextResponse.json(
        { error: 'Duplicate featured_order values are not allowed. Each featured actress must have a unique position (1-8).' },
        { status: 400 }
      );
    }

    const invalidOrders = featuredOrders.filter((o: number) => o < 1 || o > 8);
    if (invalidOrders.length > 0) {
      return NextResponse.json(
        { error: `featured_order must be between 1 and 8. Invalid values: ${invalidOrders.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute updates in a transaction using a single connection
    // Get the underlying PostgreSQL pool
    const pgPool = getPool();
    const client = await pgPool.connect();

    try {
      // Start transaction
      await client.query('BEGIN');

      try {
        // First, clear all existing featured status
        await client.query(
          `UPDATE girls SET is_featured = false, featured_order = NULL WHERE is_featured = true`
        );

        // Then update each actress
        for (const update of updates) {
          const { id, isFeatured, featuredOrder } = update;
          
          if (isFeatured) {
            // Validate featuredOrder before updating
            if (!featuredOrder || typeof featuredOrder !== 'number' || featuredOrder < 1 || featuredOrder > 8) {
              throw new Error(`Invalid featured_order value: ${featuredOrder} for actress ${id}. Order must be between 1 and 8.`);
            }
            
            await client.query(
              `UPDATE girls SET is_featured = true, featured_order = $1 WHERE id = $2`,
              [featuredOrder, id]
            );
          } else {
            await client.query(
              `UPDATE girls SET is_featured = false, featured_order = NULL WHERE id = $1`,
              [id]
            );
          }
        }

        // Commit transaction
        await client.query('COMMIT');

        return NextResponse.json({ 
          success: true,
          message: `Successfully updated ${updates.length} actresses`,
          featuredCount,
        });
      } catch (error: any) {
        // Rollback on error
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating featured actresses:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      constraint: error?.constraint,
      table: error?.table,
      column: error?.column,
      stack: error?.stack
    });
    
    // Check if it's a column missing error
    const errorMessage = error?.message || 'Unknown error';
    if (errorMessage.includes('column') && (errorMessage.includes('does not exist') || errorMessage.includes('unknown column'))) {
      return NextResponse.json(
        { 
          error: 'Database columns missing', 
          details: 'The is_featured and featured_order columns do not exist. Please run the migration script: scripts/add-featured-actresses-columns.sql',
          sqlError: errorMessage,
          migrationScript: 'scripts/add-featured-actresses-columns.sql'
        },
        { status: 500 }
      );
    }
    
    // Check if it's a constraint violation
    if (error?.code === '23514' || errorMessage.includes('check constraint') || errorMessage.includes('violates check constraint')) {
      return NextResponse.json(
        { 
          error: 'Constraint violation', 
          details: errorMessage,
          code: error?.code,
          hint: error?.hint || 'featured_order must be between 1 and 8',
          constraint: error?.constraint
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update featured actresses', 
        details: errorMessage,
        code: error?.code || error?.errno || '',
        detail: error?.detail,
        hint: error?.hint,
        constraint: error?.constraint
      },
      { status: 500 }
    );
  }
}

