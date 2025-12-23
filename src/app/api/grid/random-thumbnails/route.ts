import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import gridCache from '@/lib/cache/grid-cache';

// Function to load images from database into cache
async function loadCacheFromDatabase() {
  try {
    const poolSize = 2000; // Preload 2000 images
    
    // Use a single query without ORDER BY RAND() - much more efficient
    // Get all gallery images (mytp = 4), then randomize in JavaScript
    // Only include published actresses (published = 2)
    // Exclude "their men" category (theirman != 1)
    // Only include actresses with at least one gallery image
    const [results] = (await pool.execute(
      `SELECT 
         g.id as actressId,
         g.nm as actressName,
         g.slug as actressSlug,
         g.firstname,
         g.familiq,
         i.path as thumbnailPath
       FROM girls g
       INNER JOIN images i ON g.id = i.girlid
       WHERE g.published = 2 
         AND (g.theirman = false OR g.theirman IS NULL)
         AND i.mytp = 4 
         AND i.path IS NOT NULL 
         AND i.path != ''`
    )) as [any[], any];

    if (!Array.isArray(results) || results.length === 0) {
      console.log('No actresses found with thumbnails');
      return [];
    }

    console.log(`Found ${results.length} thumbnail records`);

    // Group by actress and collect all thumbnails
    const actressMap = new Map<number, any>();
    
    for (const row of results) {
      if (!row.thumbnailPath) continue;
      
      if (!actressMap.has(row.actressId)) {
        const actressName = row.actressName || 
          `${row.firstname || ''} ${row.familiq || ''}`.trim();
        
        const actressSlug = row.actressSlug || 
          `${row.firstname || ''}-${row.familiq || ''}`
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        actressMap.set(row.actressId, {
          actressId: row.actressId,
          actressName,
          actressSlug,
          thumbnails: [],
        });
      }
      
      const imagePath = row.thumbnailPath.startsWith('/') 
        ? row.thumbnailPath 
        : `/${row.thumbnailPath}`;
      
      actressMap.get(row.actressId).thumbnails.push(imagePath);
    }

    // For each actress, pick one random thumbnail
    const allItems = Array.from(actressMap.values()).map((actress: any) => {
      const randomThumb = actress.thumbnails[
        Math.floor(Math.random() * actress.thumbnails.length)
      ];
      
      return {
        actressId: actress.actressId,
        actressName: actress.actressName,
        actressSlug: actress.actressSlug,
        thumbnailUrl: randomThumb,
      };
    });

    // Shuffle in JavaScript (much faster than ORDER BY RAND()) and limit
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    const items = shuffled.slice(0, Math.min(poolSize, shuffled.length));

    console.log(`Loaded ${items.length} items into cache`);
    return items;
  } catch (error: any) {
    console.error('Error loading cache from database:', error.message);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '300'), 500);

    // Check if cache needs refresh (with locking to prevent concurrent refreshes)
    if (gridCache.needsRefresh() && !gridCache.isCurrentlyRefreshing()) {
      gridCache.setRefreshing(true);
      console.log('Refreshing grid cache...');
      
      // If cache is empty, wait for it to be populated (first load)
      const cacheIsEmpty = gridCache.getCacheSize() === 0;
      
      if (cacheIsEmpty) {
        // Wait for cache to be populated on first load
        const items = await loadCacheFromDatabase();
        gridCache.updateCache(items);
        console.log(`Cache populated with ${items.length} items`);
        
        // Get random items from the newly populated cache
        const randomItems = gridCache.getRandomItems(limit);
        
        return NextResponse.json({
          success: true,
          items: randomItems,
          count: randomItems.length,
          totalAvailable: gridCache.getCacheSize(), // Total entries available in cache
          cacheSize: gridCache.getCacheSize(),
        });
      } else {
        // Cache exists but needs refresh - refresh in background
        loadCacheFromDatabase()
          .then((items) => {
            gridCache.updateCache(items);
            console.log(`Cache refreshed with ${items.length} items`);
          })
          .catch((error) => {
            console.error('Error refreshing cache:', error);
            gridCache.setRefreshing(false); // Release lock on error
          });
      }
    }

    // Get random items from cache (even if refresh is in progress, use existing cache)
    const items = gridCache.getRandomItems(limit);

    if (items.length === 0) {
      // If still empty, try one more time to load
      if (gridCache.getCacheSize() === 0 && !gridCache.isCurrentlyRefreshing()) {
        gridCache.setRefreshing(true);
        const newItems = await loadCacheFromDatabase();
        gridCache.updateCache(newItems);
        const retryItems = gridCache.getRandomItems(limit);
        
        return NextResponse.json({
          success: true,
          items: retryItems,
          count: retryItems.length,
          totalAvailable: gridCache.getCacheSize(), // Total entries available in cache
          cacheSize: gridCache.getCacheSize(),
        });
      }
      
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
      });
    }

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
      totalAvailable: gridCache.getCacheSize(), // Total entries available in cache
      cacheSize: gridCache.getCacheSize(),
    });
  } catch (error: any) {
    console.error('Error fetching grid thumbnails:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

