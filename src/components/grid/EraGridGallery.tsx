'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface GridItem {
  actressId: number;
  actressName: string;
  actressSlug: string;
  imageId: number;
  thumbnailUrl: string;
}

interface EraGridGalleryProps {
  era: string;
}

const POP_INTERVAL = 50; // 50ms = 1 image every 1/20 second

// Helper function to generate thumbnail URL using the API endpoint
function getThumbnailUrl(imagePath: string): string {
  if (!imagePath) return '';
  
  // If it's already an API URL, return as-is
  if (imagePath.includes('/api/')) {
    return imagePath;
  }
  
  // Use thumbnail API endpoint with square aspect ratio for grid
  const thumbnailSize = 200;
  return `/api/images/thumbnail?path=${encodeURIComponent(imagePath)}&width=${thumbnailSize}&height=${thumbnailSize}`;
}

export default function EraGridGallery({ era }: EraGridGalleryProps) {
  const [items, setItems] = useState<GridItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const router = useRouter();
  const popIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchEraItems();
    return () => {
      if (popIntervalRef.current) {
        clearInterval(popIntervalRef.current);
      }
    };
  }, [era]);

  // Debug: Log failed images count after a delay
  useEffect(() => {
    if (items.length > 0 && !isLoading) {
      const timer = setTimeout(() => {
        if (failedImages.size > 0) {
          console.log(`[EraGridGallery] ${failedImages.size} out of ${items.length} images failed to load for era ${era}`);
        }
      }, 5000); // Wait 5 seconds for images to load
      return () => clearTimeout(timer);
    }
  }, [items.length, isLoading, failedImages.size, era]);

  const fetchEraItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setVisibleItems(new Set());
      
      const response = await fetch(`/api/grid/era/${era}`, {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
        // Start the pop-in animation after a brief delay
        setTimeout(() => {
          startPopInAnimation(data.items);
        }, 500);
      } else {
        setError(data.error || 'Failed to load images');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching era grid items:', err);
      setError(err.message || 'Failed to load gallery');
      setIsLoading(false);
    }
  };

  const startPopInAnimation = (itemsToShow: GridItem[]) => {
    // Create array of indices and shuffle for random appearance order
    const indices = Array.from({ length: itemsToShow.length }, (_, i) => i);
    const shuffledIndices = indices.sort(() => Math.random() - 0.5);
    let currentIndex = 0;
    
    setIsLoading(false); // Hide loading animation
    
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

  if (isLoading) {
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Error loading gallery</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No images found for this era</p>
          <p className="text-gray-500 text-sm">Please check back later</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <p className="text-gray-600" style={{ fontSize: '14px' }}>
          Showing {items.length} {items.length === 1 ? 'actress' : 'actresses'} from this era
        </p>
      </div>
      
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 md:gap-2">
        {items.map((item, index) => {
          const isVisible = visibleItems.has(index);
          
          return (
            <div
              key={`${item.actressId}-${item.imageId}-${index}`}
              className={`relative group cursor-pointer transition-all duration-300 ${
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
                  {isVisible && item.thumbnailUrl && !failedImages.has(index) ? (
                    <img
                      src={getThumbnailUrl(item.thumbnailUrl)}
                      alt={`${item.actressName} - ${era} glamour girl`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        const currentSrc = img.src;
                        
                        // Try fallback to direct path if thumbnail API fails
                        if (currentSrc.includes('/api/images/thumbnail') && item.thumbnailUrl) {
                          console.warn('Thumbnail API failed, trying direct path:', item.thumbnailUrl, 'for actress:', item.actressName);
                          img.src = item.thumbnailUrl;
                          // Set a flag to prevent infinite retry loop
                          img.setAttribute('data-retry', 'true');
                        } else {
                          // Both thumbnail API and direct path failed
                          console.error('Image failed to load after retry:', item.thumbnailUrl, 'for actress:', item.actressName);
                          setFailedImages(prev => new Set(prev).add(index));
                          img.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      {!isVisible && !failedImages.has(index) && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#1890ff] rounded-full animate-spin"></div>
                      )}
                      {failedImages.has(index) && (
                        <span className="text-gray-400 text-xs">No image</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hover overlay with actress name */}
              {isVisible && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none z-10" style={{ padding: '5px' }}>
                  <p 
                    className="text-white text-center px-1 leading-tight" 
                    style={{ 
                      fontFamily: "'Playfair Display', 'Didot', 'Times New Roman', serif",
                      fontSize: 'clamp(12px, 1.5vw, 16px)',
                      fontWeight: 600, // SemiBold
                      letterSpacing: '0.02em',
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                      opacity: 1,
                    }}
                  >
                    {item.actressName}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

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

