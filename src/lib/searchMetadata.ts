/**
 * Client-side search metadata service
 * Preloads and caches search metadata (total actresses, photos, HQ images)
 * for instant availability without database queries
 */

export interface SearchMetadata {
  totalEntries: number;
  totalImages: number;
  totalHQImages: number;
}

class SearchMetadataService {
  private metadata: SearchMetadata | null = null;
  private loadingPromise: Promise<SearchMetadata> | null = null;
  private readonly CACHE_KEY = 'search_metadata';
  private readonly CACHE_VERSION = '1';
  private readonly CACHE_VERSION_KEY = 'search_metadata_version';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get search metadata, loading it if necessary
   */
  async getMetadata(): Promise<SearchMetadata> {
    // Return cached metadata if available
    if (this.metadata) {
      return this.metadata;
    }

    // If already loading, return the existing promise
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Try to load from sessionStorage first
    const cached = this.loadFromCache();
    if (cached) {
      this.metadata = cached;
      return cached;
    }

    // Load from API
    this.loadingPromise = this.loadFromAPI();
    const metadata = await this.loadingPromise;
    this.loadingPromise = null;
    this.metadata = metadata;
    this.saveToCache(metadata);
    return metadata;
  }

  /**
   * Preload the metadata (call on app load)
   */
  async preload(): Promise<void> {
    try {
      await this.getMetadata();
    } catch (error) {
      console.warn('Failed to preload search metadata:', error);
      // Don't throw - use default values as fallback
    }
  }

  /**
   * Get metadata synchronously (returns cached value or null)
   */
  getMetadataSync(): SearchMetadata | null {
    return this.metadata || this.loadFromCache();
  }

  /**
   * Load metadata from API
   */
  private async loadFromAPI(): Promise<SearchMetadata> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/search-metadata`, {
        // Use cache with long TTL (browser cache)
        cache: 'force-cache',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to load search metadata: ${res.status}`);
      }

      const data = await res.json();
      
      // Check if response is an error object
      if (data && data.error) {
        throw new Error(data.error);
      }

      return {
        totalEntries: Number(data.totalEntries) || 0,
        totalImages: Number(data.totalImages) || 0,
        totalHQImages: Number(data.totalHQImages) || 0,
      };
    } catch (error) {
      console.error('Error loading search metadata from API:', error);
      // Return default values on error
      return {
        totalEntries: 0,
        totalImages: 0,
        totalHQImages: 0,
      };
    }
  }

  /**
   * Load metadata from sessionStorage cache
   */
  private loadFromCache(): SearchMetadata | null {
    if (typeof window === 'undefined') return null;

    try {
      const cachedVersion = sessionStorage.getItem(this.CACHE_VERSION_KEY);
      if (cachedVersion !== this.CACHE_VERSION) {
        // Version mismatch, clear old cache
        sessionStorage.removeItem(this.CACHE_KEY);
        sessionStorage.removeItem(this.CACHE_VERSION_KEY);
        sessionStorage.removeItem(this.CACHE_KEY + '_timestamp');
        return null;
      }

      const cached = sessionStorage.getItem(this.CACHE_KEY);
      const timestamp = sessionStorage.getItem(this.CACHE_KEY + '_timestamp');
      
      if (!cached || !timestamp) return null;

      // Check if cache is expired
      const age = Date.now() - Number(timestamp);
      if (age > this.CACHE_TTL) {
        // Cache expired, clear it
        sessionStorage.removeItem(this.CACHE_KEY);
        sessionStorage.removeItem(this.CACHE_VERSION_KEY);
        sessionStorage.removeItem(this.CACHE_KEY + '_timestamp');
        return null;
      }

      const parsed = JSON.parse(cached);
      return {
        totalEntries: Number(parsed.totalEntries) || 0,
        totalImages: Number(parsed.totalImages) || 0,
        totalHQImages: Number(parsed.totalHQImages) || 0,
      };
    } catch (error) {
      console.warn('Error loading search metadata from cache:', error);
      return null;
    }
  }

  /**
   * Save metadata to sessionStorage cache
   */
  private saveToCache(metadata: SearchMetadata): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(metadata));
      sessionStorage.setItem(this.CACHE_VERSION_KEY, this.CACHE_VERSION);
      sessionStorage.setItem(this.CACHE_KEY + '_timestamp', String(Date.now()));
    } catch (error) {
      console.warn('Error saving search metadata to cache:', error);
      // Ignore quota exceeded errors
    }
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.metadata = null;
    this.loadingPromise = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.CACHE_KEY);
      sessionStorage.removeItem(this.CACHE_VERSION_KEY);
      sessionStorage.removeItem(this.CACHE_KEY + '_timestamp');
    }
  }
}

// Singleton instance
export const searchMetadataService = new SearchMetadataService();

