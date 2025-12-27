import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { SearchActressResult } from '@/types/search';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const nameStartsWith = searchParams.get('nameStartsWith') || '';
    const surnameStartsWith = searchParams.get('surnameStartsWith') || '';
    const era = searchParams.get('era') || '';
    const isNew = searchParams.get('isNew');
    const hasNewPhotos = searchParams.get('hasNewPhotos');
    const keyword = searchParams.get('keyword') || '';
    const theirMan = searchParams.get('theirMan');

    // Require at least 3 letters for name/surname searches
    if (nameStartsWith && nameStartsWith.length < 3) {
      return NextResponse.json([] as SearchActressResult[]);
    }
    if (surnameStartsWith && surnameStartsWith.length < 3) {
      return NextResponse.json([] as SearchActressResult[]);
    }
    // For keyword: require 3+ chars UNLESS era/theirMan is selected (then allow empty/short keyword)
    if (keyword && keyword.length > 0 && keyword.length < 3) {
      // Only return empty if there's no era/theirMan filter
      // If era or theirMan is set, allow the search even with short keyword
      const hasEraFilter = era && era !== 'all';
      const hasTheirManFilter = theirMan === 'true';
      if (!hasEraFilter && !hasTheirManFilter) {
        return NextResponse.json([] as SearchActressResult[]);
      }
    }

    // Build query - include first gallery image (mytp = 4) for each actress
    // Include featured status fields and timestamps (if they exist)
    let query = `
      SELECT g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix, g.slug, g.theirman,
             g.is_featured, g.featured_order,
             COUNT(DISTINCT CASE WHEN i.mytp = 4 THEN i.id END)::int as "photoCount",
             COUNT(DISTINCT CASE WHEN i.mytp = 5 THEN i.id END)::int as "hqPhotoCount",
             (SELECT i2.path 
              FROM images i2 
              WHERE i2.girlid = g.id 
                AND i2.mytp = 4 
                AND i2.path IS NOT NULL 
                AND i2.path != ''
              ORDER BY i2.id ASC 
              LIMIT 1) as "galleryImagePath"
      FROM girls g
      LEFT JOIN images i ON g.id = i.girlid
      WHERE g.published = 2
    `;

    const params: any[] = [];

    if (nameStartsWith && nameStartsWith.length >= 3) {
      query += ` AND g.firstname ILIKE ?`;
      params.push(`${nameStartsWith}%`);
    }

    if (surnameStartsWith && surnameStartsWith.length >= 3) {
      query += ` AND g.familiq ILIKE ?`;
      params.push(`${surnameStartsWith}%`);
    }

    if (era && era !== 'all') {
      if (era === 'men') {
        query += ` AND g.theirman = true`;
      } else {
        const eraMap: Record<string, number> = {
          '20-30s': 1,
          '40s': 2,
          '50s': 3,
          '60s': 4,
        };
        if (eraMap[era]) {
          query += ` AND g.godini = ?`;
          params.push(eraMap[era]);
        }
      }
    }

    if (isNew === 'yes') {
      query += ` AND g.isnew = 2`;
    } else if (isNew === 'no') {
      query += ` AND g.isnew = 1`;
    }

    if (hasNewPhotos === 'yes') {
      query += ` AND g.isnewpix = 2`;
    } else if (hasNewPhotos === 'no') {
      query += ` AND g.isnewpix = 1`;
    }

    // Keyword search - allow even if less than 3 chars if era/theirMan is set
    if (keyword && keyword.length > 0) {
      // Only require 3+ chars if no era/theirMan filter is active
      const hasEraFilter = era && era !== 'all';
      const hasTheirManFilter = theirMan === 'true';
      
      if (keyword.length >= 3 || hasEraFilter || hasTheirManFilter) {
        query += ` AND (
          g.nm ILIKE ? OR 
          g.firstname ILIKE ? OR 
          g.familiq ILIKE ? OR
          EXISTS (
            SELECT 1 FROM girlinfos gi 
            WHERE gi.girlid = g.id 
            AND (gi.shrttext ILIKE ? OR gi.lngtext ILIKE ?)
          )
        )`;
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam, keywordParam, keywordParam, keywordParam);
      }
    }

    if (theirMan === 'true') {
      query += ` AND g.theirman = true`;
    }

    // Check if we should order by created_at or updated_at (for Latest Additions)
    // Note: created_at/updated_at may not exist in all database schemas, so we skip ordering by them
    const orderBy = searchParams.get('orderBy');
    
    // Check if we should order by created_at or updated_at (for Latest Additions)
    const orderBy = searchParams.get('orderBy');
    const orderByCreatedAt = orderBy === 'created_at';
    const orderByUpdatedAt = orderBy === 'updated_at';
    
    // Build GROUP BY clause - include timestamps if they exist
    query += ` GROUP BY g.id, g.nm, g.firstname, g.familiq, g.godini, g.isnew, g.isnewpix, g.slug, g.theirman, g.is_featured, g.featured_order`;
    
    // Order by timestamps if requested (for Latest Additions), otherwise default to name
    if (orderByUpdatedAt) {
      // Order by updated_at DESC (latest edited entries)
      // Will gracefully fail if column doesn't exist - API will return error
      query += ` ORDER BY g.updated_at DESC NULLS LAST, g.id DESC`;
    } else if (orderByCreatedAt) {
      // Order by created_at DESC (new entries)
      // Will gracefully fail if column doesn't exist - API will return error
      query += ` ORDER BY g.created_at DESC NULLS LAST, g.id DESC`;
    } else {
      // Default ordering by name
      query += ` ORDER BY g.familiq, g.firstname`;
    }

    const [results] = await pool.execute(query, params) as any[];

    const eraMap: Record<number, string> = {
      1: '20-30s',
      2: '40s',
      3: '50s',
      4: '60s',
    };

    // Map database results to typed SearchActressResult interface
    const actresses: SearchActressResult[] = Array.isArray(results) ? results.map((row: any) => {
      // Generate slug if not present
      let slug = row.slug;
      if (!slug) {
        slug = `${row.firstname || ''}-${row.familiq || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      
      const years = eraMap[Number(row.godini)] || '50s';
      
      // Get preview image URL - always populate (gallery image or placeholder)
      let previewImageUrl: string;
      if (row.galleryImagePath) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const cleanPath = row.galleryImagePath.startsWith('/') ? row.galleryImagePath.slice(1) : row.galleryImagePath;
        previewImageUrl = supabaseUrl 
          ? `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${cleanPath}`
          : '/images/placeholder-portrait.png';
      } else {
        previewImageUrl = '/images/placeholder-portrait.png';
      }
      
      return {
        id: Number(row.id) || 0,
        name: String(row.nm || ''),
        firstName: String(row.firstname || ''),
        lastName: String(row.familiq || ''),
        slug: slug,
        years: years,
        decade: years, // Alias for compatibility
        photoCount: Number(row.photoCount) || 0,
        hqPhotoCount: Number(row.hqPhotoCount) || 0,
        isNew: Number(row.isnew) === 2,
        hasNewPhotos: Number(row.isnewpix) === 2,
        headshot: `/api/actresses/${row.id}/headshot`, // Keep for backward compatibility
        previewImageUrl: previewImageUrl, // Always populated - gallery image or placeholder
        theirMan: Boolean(row.theirman) === true, // Add theirMan flag
        isFeatured: Boolean(row.is_featured) === true, // Featured status
        featuredOrder: row.featured_order ? Number(row.featured_order) : null, // Featured order (1-4)
      };
    }) : [];

    return NextResponse.json(actresses);
  } catch (error: any) {
    console.error('Database error in /api/actresses:', error);
    
    // If it's a connection error, return empty array instead of error to prevent frontend crashes
    // The frontend will show "no results" which is better than crashing
    if (error?.message?.includes('Too many connections') || 
        error?.code === 'ER_CON_COUNT_ERROR' ||
        error?.code === 'PROTOCOL_CONNECTION_LOST') {
      console.warn('Connection pool exhausted, returning empty results');
      return NextResponse.json([] as SearchActressResult[]);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch actresses', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

