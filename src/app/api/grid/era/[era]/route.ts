import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Era mapping: URL slug -> database value
const ERA_MAP: Record<string, number> = {
  '1930s': 1,
  '1920s-1930s': 1,
  '1940s': 2,
  '1950s': 3,
  '1960s': 4,
};

// Reverse mapping for display
const ERA_DISPLAY: Record<number, string> = {
  1: '1920s-1930s',
  2: '1940s',
  3: '1950s',
  4: '1960s',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ era: string }> }
) {
  try {
    const { era } = await params;
    const eraValue = ERA_MAP[era];

    if (!eraValue) {
      return NextResponse.json(
        { success: false, error: `Invalid era: ${era}. Valid eras: 1930s, 1940s, 1950s, 1960s` },
        { status: 400 }
      );
    }

    // Get all published girls for this era with at least one gallery image
    // Exclude "their men" category (theirman != 1)
    // Use INNER JOIN to only include actresses with gallery images (mytp = 4)
    const [actresses] = await pool.execute(
      `SELECT DISTINCT
         g.id as actressId,
         g.nm as actressName,
         g.slug as actressSlug,
         g.firstname,
         g.familiq
       FROM girls g
       INNER JOIN images i ON g.id = i.girlid
       WHERE g.published = 2 
         AND g.godini = ?
         AND (g.theirman = false OR g.theirman IS NULL)
         AND i.mytp = 4
         AND i.path IS NOT NULL 
         AND i.path != ''
       ORDER BY g.nm ASC, g.firstname ASC, g.familiq ASC`,
      [eraValue]
    ) as any[];

    if (!Array.isArray(actresses) || actresses.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        era: ERA_DISPLAY[eraValue],
      });
    }

    // For each actress, get their FIRST gallery image (mytp = 4) - consistent and predictable
    const actressIds = actresses.map((a: any) => a.actressId);
    const placeholders = actressIds.map(() => '?').join(',');
    
    // Get first gallery image per actress using subquery for reliability
    const [imageResults] = await pool.execute(
      `SELECT 
         i1.girlid as actressId,
         i1.id as imageId,
         i1.path as imagePath,
         i1.mytp as imageType
       FROM images i1
       INNER JOIN (
         SELECT girlid, MIN(id) as minId
         FROM images
         WHERE girlid IN (${placeholders})
           AND mytp = 4
           AND path IS NOT NULL 
           AND path != ''
         GROUP BY girlid
       ) i2 ON i1.girlid = i2.girlid AND i1.id = i2.minId`,
      actressIds
    ) as any[];

    // Create a map of actress data
    const actressDataMap = new Map<number, any>();
    for (const actress of actresses) {
      const actressName = actress.actressName || 
        `${actress.firstname || ''} ${actress.familiq || ''}`.trim();
      
      const actressSlug = actress.actressSlug || 
        `${actress.firstname || ''}-${actress.familiq || ''}`
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

      actressDataMap.set(actress.actressId, {
        actressId: actress.actressId,
        actressName,
        actressSlug,
      });
    }

    // Create a map of images by actress ID
    const actressImageMap = new Map<number, any>();
    
    if (Array.isArray(imageResults) && imageResults.length > 0) {
      for (const row of imageResults) {
        if (!row.imagePath) continue;
        
        const actressId = row.actressId;
        const imagePath = row.imagePath.startsWith('/') 
          ? row.imagePath 
          : `/${row.imagePath}`;
        
        // Store only the first image per actress (already filtered by query)
        if (!actressImageMap.has(actressId)) {
          actressImageMap.set(actressId, {
            imageId: row.imageId,
            thumbnailUrl: imagePath,
          });
        }
      }
    }

    // Build items array in alphabetical order (already sorted from query)
    // Only include actresses that have at least one gallery image
    const allItems = actresses
      .filter((actress: any) => actressImageMap.has(actress.actressId))
      .map((actress: any) => {
        const imageData = actressImageMap.get(actress.actressId);
        const actressName = actress.actressName || 
          `${actress.firstname || ''} ${actress.familiq || ''}`.trim();
        
        const actressSlug = actress.actressSlug || 
          `${actress.firstname || ''}-${actress.familiq || ''}`
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        return {
          actressId: actress.actressId,
          actressName,
          actressSlug,
          imageId: imageData?.imageId || null,
          thumbnailUrl: imageData?.thumbnailUrl || null,
        };
      });

    return NextResponse.json({
      success: true,
      items: allItems,
      count: allItems.length,
      era: ERA_DISPLAY[eraValue],
      eraValue,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error fetching era grid items:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

