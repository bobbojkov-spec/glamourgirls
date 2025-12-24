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
    // Exclude "their men" category (theirman != 1 and theirman != '1')
    // Use INNER JOIN to only include actresses with gallery images (mytp = 4)
    // Match the same query pattern as random-thumbnails (no path filtering)
    console.log(`[Grid API] Executing query for era ${era} (godini=${eraValue})...`);
    
    // First, let's verify the query works with a simple test
    try {
      const [testQuery] = await pool.execute(
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
      const testCount = testQuery?.[0]?.count || 0;
      console.log(`[Grid API] Test query count: ${testCount}`);
    } catch (testError: any) {
      console.error(`[Grid API] Test query failed:`, testError.message);
    }
    
    // Use the EXACT same query that works in test-era-query
    // PostgreSQL returns lowercase column names from aliases
    const [actresses] = await pool.execute(
      `SELECT DISTINCT
         g.id as "actressId",
         g.nm as "actressName",
         g.slug as "actressSlug",
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
       ORDER BY g.nm ASC, g.firstname ASC, g.familiq ASC`,
      [eraValue]
    ) as any[];
    
    console.log(`[Grid API] Query returned ${Array.isArray(actresses) ? actresses.length : 'non-array'} results`);
    if (Array.isArray(actresses) && actresses.length > 0) {
      console.log(`[Grid API] First result keys:`, Object.keys(actresses[0]));
      console.log(`[Grid API] First result:`, JSON.stringify(actresses[0]));
    }
    
    // Map to ensure consistent property names (handle both lowercase and camelCase)
    const mappedActresses = (actresses || []).map((a: any) => ({
      actressId: a.actressId || a.actressid || a.id,
      actressName: a.actressName || a.actressname || a.nm,
      actressSlug: a.actressSlug || a.actressslug || a.slug,
      firstname: a.firstname,
      familiq: a.familiq,
      theirman: a.theirman,
    }));
    
    console.log(`[Grid API] Mapped ${mappedActresses.length} actresses`);
    
    console.log(`[Grid API] Query returned ${Array.isArray(actresses) ? actresses.length : 'non-array'} results`);
    if (Array.isArray(actresses) && actresses.length > 0) {
      console.log(`[Grid API] Sample actress:`, JSON.stringify(actresses[0]));
    } else if (!Array.isArray(actresses)) {
      console.error(`[Grid API] ERROR: Query did not return an array! Type: ${typeof actresses}, Value:`, actresses);
    }
    
    // Filter out "their men" in JavaScript to see what we're getting
    // Based on test-db, we know there are 21 actresses with era 1 and gallery images
    // So if we're getting 0, the theirman filter might be too strict
    console.log(`[Grid API] Raw query results: ${mappedActresses.length} actresses`);
    if (mappedActresses.length > 0) {
      console.log(`[Grid API] Sample theirman values:`, mappedActresses.slice(0, 5).map((a: any) => ({ id: a.actressId, theirman: a.theirman, type: typeof a.theirman })));
    }
    
    const filteredActresses = mappedActresses.filter((a: any) => {
      const theirman = a.theirman;
      // Only exclude if explicitly set to true/1/'true'/'1'
      // Allow null, false, 'false', 0, or any other value
      if (theirman === true || theirman === 1 || theirman === 'true' || theirman === '1') {
        return false;
      }
      return true;
    });
    
    console.log(`[Grid API] Era ${era}: Before theirman filter: ${mappedActresses.length}, After: ${filteredActresses.length}`);
    
    // If all actresses are filtered out, let's see what theirman values are
    if (mappedActresses.length > 0 && filteredActresses.length === 0) {
      const theirmanValues = mappedActresses.map((a: any) => a.theirman);
      const uniqueValues = [...new Set(theirmanValues)];
      console.log(`[Grid API] WARNING: All ${mappedActresses.length} actresses filtered out! Unique theirman values:`, uniqueValues);
    }
    
    // Use filtered list
    const actressesToUse = filteredActresses;

    // Log query results for debugging
    console.log(`[Grid API] Era ${era} (value: ${eraValue}): Found ${actressesToUse?.length || 0} actresses`);
    
    if (!Array.isArray(actressesToUse) || actressesToUse.length === 0) {
      console.log(`[Grid API] No actresses found, running diagnostic queries...`);
      
      let debugInfo: any = {
        message: 'No actresses found matching criteria',
        queryConditions: {
          published: 2,
          godini: eraValue,
          mytp: 4,
          pathNotNull: true,
        },
      };
      
      try {
        // Try a simpler query to see if there are any actresses at all for this era
        const [testActresses] = await pool.execute(
          `SELECT COUNT(*) as count FROM girls WHERE published = 2 AND godini = ?`,
          [eraValue]
        ) as any[];
        const totalCount = testActresses?.[0]?.count || 0;
        debugInfo.totalPublishedForEra = totalCount;
        console.log(`[Grid API] Total published actresses for era ${eraValue}: ${totalCount}`);
      } catch (e: any) {
        console.error(`[Grid API] Error in diagnostic query 1:`, e.message);
        debugInfo.diagnosticError1 = e.message;
      }
      
      try {
        // Check if there are any actresses with gallery images (without era filter)
        const [testAll] = await pool.execute(
          `SELECT COUNT(DISTINCT g.id) as count 
           FROM girls g
           INNER JOIN images i ON g.id = i.girlid
           WHERE g.published = 2 
             AND i.mytp = 4
             AND i.path IS NOT NULL 
             AND i.path != ''`
        ) as any[];
        const allCount = testAll?.[0]?.count || 0;
        debugInfo.totalWithGalleryImages = allCount;
        console.log(`[Grid API] Total published actresses with gallery images (all eras): ${allCount}`);
      } catch (e: any) {
        console.error(`[Grid API] Error in diagnostic query 2:`, e.message);
        debugInfo.diagnosticError2 = e.message;
      }
      
      try {
        // Check actresses with era filter but without theirman filter
        const [testEraOnly] = await pool.execute(
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
        const eraOnlyCount = testEraOnly?.[0]?.count || 0;
        debugInfo.eraWithGalleryImages = eraOnlyCount;
        console.log(`[Grid API] Published actresses for era ${eraValue} (without theirman filter): ${eraOnlyCount}`);
      } catch (e: any) {
        console.error(`[Grid API] Error in diagnostic query 3:`, e.message);
        debugInfo.diagnosticError3 = e.message;
      }
      
      try {
        // Check what godini values actually exist
        const [godiniValues] = await pool.execute(
          `SELECT DISTINCT godini, COUNT(*) as count 
           FROM girls 
           WHERE published = 2 
           GROUP BY godini 
           ORDER BY godini`
        ) as any[];
        debugInfo.availableGodiniValues = godiniValues || [];
        console.log(`[Grid API] Available godini values:`, JSON.stringify(godiniValues));
      } catch (e: any) {
        console.error(`[Grid API] Error in diagnostic query 4:`, e.message);
        debugInfo.diagnosticError4 = e.message;
      }
      
      // Always return debug info
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        era: ERA_DISPLAY[eraValue],
        debug: debugInfo,
      });
    }

    // For each actress, get their FIRST gallery image (mytp = 4) - consistent and predictable
    const actressIds = actressesToUse.map((a: any) => a.actressId);
    console.log(`[Grid API] Fetching images for ${actressIds.length} actresses`);
    
    if (actressIds.length === 0) {
      console.log(`[Grid API] No actress IDs to fetch images for!`);
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        era: ERA_DISPLAY[eraValue],
      });
    }
    
    const placeholders = actressIds.map(() => '?').join(',');
    
    // Get first gallery image per actress using subquery for reliability
    // Match the same query pattern as random-thumbnails (no path filtering)
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
    
    console.log(`[Grid API] Image query returned ${Array.isArray(imageResults) ? imageResults.length : 'non-array'} results`);
    if (Array.isArray(imageResults) && imageResults.length > 0) {
      console.log(`[Grid API] Sample image result:`, JSON.stringify(imageResults[0]));
    }

    // Create a map of actress data
    const actressDataMap = new Map<number, any>();
    for (const actress of actressesToUse) {
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
    
    // Helper to convert database paths to Supabase Storage URLs
    const getStorageUrl = (path: string | null | undefined): string => {
      if (!path) return '';
      if (path.startsWith('http')) return path; // Already a URL
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        // Fallback to original path if Supabase URL not set
        return path.startsWith('/') ? path : `/${path}`;
      }
      
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${supabaseUrl}/storage/v1/object/public/glamourgirls_images/${cleanPath}`;
    };
    
    if (Array.isArray(imageResults) && imageResults.length > 0) {
      console.log(`[Grid API] Processing ${imageResults.length} image results`);
      for (const row of imageResults) {
        // Handle both camelCase and lowercase column names from PostgreSQL
        const actressId = row.actressId || row.actressid || row.girlid;
        const imagePath = row.imagePath || row.imagepath || row.path;
        const imageId = row.imageId || row.imageid || row.id;
        
        if (!imagePath) {
          console.log(`[Grid API] Skipping row with no imagePath:`, row);
          continue;
        }
        
        // Store only the first image per actress (already filtered by query)
        if (!actressImageMap.has(actressId)) {
          actressImageMap.set(actressId, {
            imageId: imageId,
            thumbnailUrl: getStorageUrl(imagePath),
          });
        }
      }
      console.log(`[Grid API] Built image map with ${actressImageMap.size} entries`);
    } else {
      console.log(`[Grid API] No image results to process`);
    }

    // Build items array in alphabetical order (already sorted from query)
    // Only include actresses that have at least one gallery image
    console.log(`[Grid API] Building items array from ${actressesToUse.length} actresses, ${actressImageMap.size} have images`);
    const allItems = actressesToUse
      .filter((actress: any) => {
        const hasImage = actressImageMap.has(actress.actressId);
        if (!hasImage) {
          console.log(`[Grid API] Actress ${actress.actressId} (${actress.actressName}) has no image`);
        }
        return hasImage;
      })
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

    console.log(`[Grid API] Final items array has ${allItems.length} items`);
    if (allItems.length > 0) {
      console.log(`[Grid API] Sample item:`, JSON.stringify(allItems[0]));
    }

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
    const { era: eraParam } = await params;
    console.error('[Grid API] Error fetching era grid items:', error);
    console.error('[Grid API] Error stack:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        debug: {
          errorType: error.constructor.name,
          errorMessage: error.message,
          era: eraParam,
          eraValue: ERA_MAP[eraParam],
        },
      },
      { status: 500 }
    );
  }
}

