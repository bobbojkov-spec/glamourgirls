'use client';

import { useEffect } from 'react';
import { searchMetadataService } from '@/lib/searchMetadata';

/**
 * Preloads search metadata on app load
 * This ensures metadata is ready when the user first opens the search modal
 */
export default function SearchMetadataPreloader() {
  useEffect(() => {
    // Preload in the background - don't block rendering
    searchMetadataService.preload().catch((error) => {
      // Silently fail - metadata will load when needed
      console.debug('Search metadata preload failed (non-critical):', error);
    });
  }, []);

  return null; // This component doesn't render anything
}

