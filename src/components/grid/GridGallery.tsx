'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface GridItem {
  actressId: number;
  actressName: string;
  actressSlug: string;
  thumbnailUrl: string;
}

const INITIAL_LOAD = 100;
const LOAD_MORE_BATCH = 100;
const POP_INTERVAL = 30; // 30ms = faster popping animation

export default function GridGallery() {
  const [allItems, setAllItems] = useState<GridItem[]>([]); // All loaded items
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set()); // Track which items are visible
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const popIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInitialItems();
    return () => {
      if (popIntervalRef.current) {
        clearInterval(popIntervalRef.current);
      }
    };
  }, []);

  const fetchInitialItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/grid/random-thumbnails?limit=${INITIAL_LOAD}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.items) && data.items.length > 0) {
        setAllItems(data.items);
        setTotalAvailable(data.totalAvailable || data.items.length);
        setHasMore(data.items.length >= INITIAL_LOAD && (data.totalAvailable || data.items.length) > INITIAL_LOAD);
        
        // Start the pop-in animation after a brief delay
        setTimeout(() => {
          startPopInAnimation(data.items, 0);
        }, 300);
      } else {
        if (data.error) {
          console.error('API returned error:', data.error);
        }
        setIsLoading(false);
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error fetching grid items:', error.message);
      setIsLoading(false);
      setHasMore(false);
    }
  };

  const loadMoreItems = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    try {
      // Fetch next batch
      const currentCount = allItems.length;
      const response = await fetch(`/api/grid/random-thumbnails?limit=${currentCount + LOAD_MORE_BATCH}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.items) && data.items.length > currentCount) {
        // Wait a moment to show loading state
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const newItems = data.items.slice(currentCount);
        setAllItems(data.items);
        
        // Update total if available
        if (data.totalAvailable) {
          setTotalAvailable(data.totalAvailable);
        }
        
        // Check if there's more to load
        const total = data.totalAvailable || data.items.length;
        setHasMore(data.items.length < total);
        
        // Start popping animation for new items
        setTimeout(() => {
          startPopInAnimation(newItems, currentCount);
          setIsLoadingMore(false);
        }, 200);
      } else {
        setHasMore(false);
        setIsLoadingMore(false);
      }
    } catch (error: any) {
      console.error('Error loading more items:', error.message);
      setIsLoadingMore(false);
      setHasMore(false);
    }
  };

  const startPopInAnimation = (itemsToShow: GridItem[], startIndex: number) => {
    // Clear any existing interval
    if (popIntervalRef.current) {
      clearInterval(popIntervalRef.current);
    }
    
    // Create array of indices and shuffle for random appearance order
    const indices = Array.from({ length: itemsToShow.length }, (_, i) => startIndex + i);
    const shuffledIndices = indices.sort(() => Math.random() - 0.5);
    let currentIndex = 0;
    
    setIsLoading(false); // Hide initial loading animation
    
    popIntervalRef.current = setInterval(() => {
      if (currentIndex < shuffledIndices.length) {
        const itemIndex = shuffledIndices[currentIndex];
        setVisibleItems((prev) => {
          const newSet = new Set(prev);
          newSet.add(itemIndex);
          return newSet;
        });
        currentIndex++;
      } else {
        if (popIntervalRef.current) {
          clearInterval(popIntervalRef.current);
          popIntervalRef.current = null;
        }
      }
    }, POP_INTERVAL);
  };

  const handleClick = (item: GridItem) => {
    router.push(`/actress/${item.actressId}/${item.actressSlug}`);
  };

  // Show loading animation
  if (isLoading && allItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-[#1890ff] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-[#8b7355] border-t-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
          </div>
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-protest-strike)', fontSize: '14px' }}>
            Loading Gallery...
          </p>
        </div>
      </div>
    );
  }

  if (allItems.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No images found</p>
          <p className="text-gray-500 text-sm">Please check the browser console for details</p>
        </div>
      </div>
    );
  }

  const displayedCount = visibleItems.size;
  const remainingCount = totalAvailable ? totalAvailable - displayedCount : 0;

  return (
    <>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 md:gap-2">
        {allItems.map((item, index) => {
          const isVisible = visibleItems.has(index);
          
          return (
            <div
              key={`${item.actressId}-${index}`}
              className={`interactive-row relative group ${
                isVisible 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-95'
              }`}
              style={{
                animation: isVisible ? 'popIn 0.3s ease-out' : 'none',
              }}
              onClick={() => handleClick(item)}
            >
              {/* Vintage rounded white frame with 4-5px border */}
              <div className="relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow" style={{ padding: '5px' }}>
                <div className="relative aspect-[3/4] bg-gray-100 rounded overflow-hidden">
                  {isVisible && item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.actressName}
                      className="w-full h-full object-cover"
                      loading={index < INITIAL_LOAD ? 'eager' : 'lazy'}
                      onError={(e) => {
                        console.error('Image failed to load:', item.thumbnailUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      {!isVisible && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#1890ff] rounded-full animate-spin"></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hover overlay with actress name */}
              {isVisible && (
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none z-10" style={{ padding: '5px' }}>
                  <p className="text-white text-[10px] font-bold text-center px-1 leading-tight uppercase" style={{ fontFamily: "'Kabel Black', sans-serif" }}>
                    {item.actressName}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Load More Button */}
      {hasMore && (
        <div className="flex flex-col items-center justify-center py-8 mt-4">
          {isLoadingMore ? (
            <div className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-3">
                <div className="absolute inset-0 border-3 border-[#1890ff] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600 text-sm">Loading more images...</p>
            </div>
          ) : (
            <button
              onClick={loadMoreItems}
              className="px-8 py-3 bg-[#1890ff] hover:bg-[#b8901f] text-white font-bold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              style={{
                fontFamily: 'var(--font-vintage-headline)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Load More
            </button>
          )}
          {totalAvailable && (
            <p className="text-gray-600 text-sm mt-3">
              Showing {displayedCount} of {totalAvailable} entries
              {remainingCount > 0 && ` • ${remainingCount} more available`}
            </p>
          )}
        </div>
      )}
      
      {!hasMore && displayedCount > 0 && (
        <div className="flex justify-center items-center py-4">
          <p className="text-gray-500 text-sm">
            All {displayedCount} {displayedCount === 1 ? 'entry' : 'entries'} loaded
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}
