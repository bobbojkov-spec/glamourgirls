// In-memory cache for grid thumbnails
// This allows fast random selection without hitting the database every time

interface CachedItem {
  actressId: number;
  actressName: string;
  actressSlug: string;
  thumbnailUrl: string;
}

class GridCache {
  private cache: CachedItem[] = [];
  private lastRefresh: number = 0;
  private refreshInterval: number = 10 * 60 * 1000; // 10 minutes
  private poolSize: number = 2000; // Preload 2000 images
  private isRefreshing: boolean = false; // Lock to prevent concurrent refreshes

  // Get random items from cache
  getRandomItems(count: number): CachedItem[] {
    if (this.cache.length === 0) {
      return [];
    }

    // Shuffle and return requested count
    const shuffled = [...this.cache].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // Check if cache needs refresh
  needsRefresh(): boolean {
    return (
      (this.cache.length === 0 ||
      Date.now() - this.lastRefresh > this.refreshInterval) &&
      !this.isRefreshing // Don't refresh if already refreshing
    );
  }

  // Check if currently refreshing
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }

  // Set refreshing lock
  setRefreshing(refreshing: boolean): void {
    this.isRefreshing = refreshing;
  }

  // Update cache
  updateCache(items: CachedItem[]): void {
    this.cache = items;
    this.lastRefresh = Date.now();
    this.isRefreshing = false; // Release lock
  }

  // Get current cache size
  getCacheSize(): number {
    return this.cache.length;
  }

  // Force refresh
  clearCache(): void {
    this.cache = [];
    this.lastRefresh = 0;
  }
}

// Singleton instance
const gridCache = new GridCache();

export default gridCache;

