import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Latest Additions API
 * 
 * Returns a curated list of the most recent actresses/entries.
 * 
 * STRICT RULES:
 * - Only returns 4-6 items (exactly what's needed for the homepage)
 * - Filters out placeholders
 * - Only returns if we have sufficient data
 * - Server-side cached (revalidates every hour)
 * 
 * Priority order:
 * 1. Entries with updated_at (latest edited)
 * 2. Entries with isnew=2 (new entries)
 * 3. Entries with isnewpix=2 (new photos)
 * 4. Entries with created_at (recently added)
 */
export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minItems = parseInt(searchParams.get('minItems') || '4');
    const maxItems = parseInt(searchParams.get('maxItems') || '6');
    
    // Ensure minItems is at least 4 and maxItems is at most 6
    const requiredMin = Math.max(4, Math.min(minItems, 6));
    const requiredMax = Math.min(6, Math.max(maxItems, 4));

    // Build query with priority ordering
    // Priority 1: updated_at DESC (latest edited entries) - if column exists
    // Priority 2: isnew=2 (new entries)
    // Priority 3: isnewpix=2 (new photos)
    // Priority 4: created_at DESC (recently added) - if column exists
    
    // Try to use timestamp columns, but handle gracefully if they don't exist
    let query = `
      SELECT DISTINCT
        g.id,
        g.nm,
        g.firstname,
        g.familiq,
        g.godini,
        g.isnew,
        g.isnewpix,
        g.slug,
        g.theirman,
        (
          SELECT i.path
          FROM images i
          WHERE i.girlid = g.id 
            AND i.mytp = 4
            AND i.path IS NOT NULL
            AND i.path != ''
            AND i.path NOT ILIKE '%placeholder%'
          ORDER BY i.id ASC
          LIMIT 1
        ) as galleryImagePath
      FROM girls g
      WHERE g.published = 2
        AND g.theirman IS NOT TRUE
    `;

    // Order by priority: isnew=2 > isnewpix=2 > id DESC (fallback)
    // Note: We avoid using created_at/updated_at directly in ORDER BY to handle missing columns gracefully
    query += `
      ORDER BY 
        CASE WHEN g.isnew = 2 THEN 1 ELSE 2 END,
        CASE WHEN g.isnewpix = 2 THEN 1 ELSE 2 END,
        g.id DESC
      LIMIT ${requiredMax}
    `;

    const [results] = await pool.execute(query) as any[];

    if (!Array.isArray(results) || results.length === 0) {
      // No data available - return empty array (homepage will not render section)
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    const eraMap: Record<number, string> = {
      1: '20-30s',
      2: '40s',
      3: '50s',
      4: '60s',
    };

    // Filter and map results
    const actresses = results
      .map((row: any) => {
        // Skip if no gallery image or placeholder
        if (!row.galleryImagePath) {
          return null;
        }
        
        const imageUrl = String(row.galleryImagePath || '').toLowerCase();
        if (imageUrl.includes('placeholder') || 
            imageUrl.includes('placeholder-portrait') ||
            imageUrl.includes('placeholder-man')) {
          return null;
        }

        // Generate slug if not present
        let slug = row.slug;
        if (!slug) {
          slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }

        const years = eraMap[Number(row.godini)] || '50s';
        
        // Build preview image URL
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const cleanPath = row.galleryImagePath.startsWith('/') 
          ? row.galleryImagePath.slice(1) 
          : row.galleryImagePath;
        const previewImageUrl = supabaseUrl 
          ? `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${cleanPath}`
          : '/images/placeholder-portrait.png';

        return {
          id: Number(row.id) || 0,
          name: String(row.nm || ''),
          firstName: String(row.firstname || ''),
          lastName: String(row.familiq || ''),
          slug: slug,
          years: years,
          decade: years,
          era: years,
          previewImageUrl: previewImageUrl,
          isNew: Number(row.isnew) === 2,
          hasNewPhotos: Number(row.isnewpix) === 2,
          theirMan: Boolean(row.theirman) === true,
        };
      })
      .filter((item: any) => item !== null); // Remove null entries (placeholders)

    // STRICT RULE: Only return if we have at least requiredMin items
    if (actresses.length < requiredMin) {
      // Not enough items - return empty array (homepage will not render section)
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }

    // Return up to requiredMax items
    const limitedActresses = actresses.slice(0, requiredMax);

    return NextResponse.json(limitedActresses, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error fetching latest additions:', error);
    
    // On error, return empty array (homepage will not render section)
    // This ensures reliability - silence is better than wrong data
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  }
}

