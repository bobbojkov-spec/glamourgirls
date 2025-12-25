/**
 * Client-side search index service
 * Preloads and caches actress search data for instant filtering
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

export interface SearchFilters {
  keyword?: string;
  era?: string; // 'all', '20-30s', '40s', '50s', '60s', 'men'
}

class SearchIndexService {
  private index: ActressSearchIndexItem[] | null = null;
  private loadingPromise: Promise<ActressSearchIndexItem[]> | null = null;
  private readonly CACHE_KEY = 'actress_search_index';
  private readonly CACHE_VERSION = '1';
  private readonly CACHE_VERSION_KEY = 'actress_search_index_version';

  /**
   * Get the search index, loading it if necessary
   */
  async getIndex(): Promise<ActressSearchIndexItem[]> {
    // Return cached index if available
    if (this.index) {
      return this.index;
    }

    // If already loading, return the existing promise
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Try to load from sessionStorage first
    const cached = this.loadFromCache();
    if (cached) {
      this.index = cached;
      return cached;
    }

    // Load from API
    this.loadingPromise = this.loadFromAPI();
    const index = await this.loadingPromise;
    this.loadingPromise = null;
    this.index = index;
    this.saveToCache(index);
    return index;
  }

  /**
   * Preload the index (call on app load or first search focus)
   */
  async preload(): Promise<void> {
    try {
      await this.getIndex();
    } catch (error) {
      console.warn('Failed to preload search index:', error);
      // Don't throw - allow search to work with server queries as fallback
    }
  }

  /**
   * Load index from API
   */
  private async loadFromAPI(): Promise<ActressSearchIndexItem[]> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const res = await fetch(`${baseUrl}/api/actresses/index`);
      
      if (!res.ok) {
        throw new Error(`Failed to load search index: ${res.status}`);
      }

      const data = await res.json();
      
      // Check if response is an error object
      if (data && data.error) {
        throw new Error(data.error);
      }

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading search index from API:', error);
      return [];
    }
  }

  /**
   * Load index from sessionStorage cache
   */
  private loadFromCache(): ActressSearchIndexItem[] | null {
    if (typeof window === 'undefined') return null;

    try {
      const cachedVersion = sessionStorage.getItem(this.CACHE_VERSION_KEY);
      if (cachedVersion !== this.CACHE_VERSION) {
        // Version mismatch, clear old cache
        sessionStorage.removeItem(this.CACHE_KEY);
        sessionStorage.removeItem(this.CACHE_VERSION_KEY);
        return null;
      }

      const cached = sessionStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.warn('Error loading search index from cache:', error);
      return null;
    }
  }

  /**
   * Save index to sessionStorage cache
   */
  private saveToCache(index: ActressSearchIndexItem[]): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(index));
      sessionStorage.setItem(this.CACHE_VERSION_KEY, this.CACHE_VERSION);
    } catch (error) {
      console.warn('Error saving search index to cache:', error);
      // Ignore quota exceeded errors
    }
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.index = null;
    this.loadingPromise = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.CACHE_KEY);
      sessionStorage.removeItem(this.CACHE_VERSION_KEY);
    }
  }

  /**
   * Filter actresses using client-side index
   * Returns matching actresses and a boolean indicating if results exist
   */
  async filter(filters: SearchFilters): Promise<{
    matches: ActressSearchIndexItem[];
    hasResults: boolean;
  }> {
    const index = await this.getIndex();
    
    if (index.length === 0) {
      return { matches: [], hasResults: false };
    }

    let matches = index;

    // Filter by era
    if (filters.era && filters.era !== 'all') {
      if (filters.era === 'men') {
        matches = matches.filter(a => a.theirMan === true);
      } else {
        matches = matches.filter(a => a.decade === filters.era);
      }
    }

    // Filter by keyword (case-insensitive)
    if (filters.keyword && filters.keyword.trim().length > 0) {
      const keyword = filters.keyword.trim().toLowerCase();
      
      matches = matches.filter(actress => {
        // Search in firstname, middlenames, familiq
        const firstname = (actress.firstname || '').toLowerCase();
        const middlenames = (actress.middlenames || '').toLowerCase();
        const familiq = (actress.familiq || '').toLowerCase();
        const fullName = `${firstname} ${middlenames} ${familiq}`.trim();
        
        return firstname.includes(keyword) ||
               (middlenames && middlenames.includes(keyword)) ||
               familiq.includes(keyword) ||
               fullName.includes(keyword);
      });
    }

    return {
      matches,
      hasResults: matches.length > 0,
    };
  }

  /**
   * Check if a search would have results (for instant feedback)
   */
  async hasResults(filters: SearchFilters): Promise<boolean> {
    const { hasResults } = await this.filter(filters);
    return hasResults;
  }
}

// Singleton instance
export const searchIndexService = new SearchIndexService();

