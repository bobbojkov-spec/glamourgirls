'use client';

import { useEffect } from 'react';
import { searchIndexService } from '@/lib/searchIndex';

/**
 * Preloads the search index on app load
 * This ensures the index is ready when the user first opens the search modal
 */
export default function SearchIndexPreloader() {
  useEffect(() => {
    // Preload in the background - don't block rendering
    searchIndexService.preload().catch((error) => {
      // Silently fail - search will still work with server queries
      console.debug('Search index preload failed (non-critical):', error);
    });
  }, []);

  return null; // This component doesn't render anything
}

