'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Dynamically import the modal to avoid SSR issues
const EraGridGalleryModal = dynamic(() => import('./EraGridGalleryModal'), {
  ssr: false,
});

interface GridItem {
  actressId: number;
  actressName: string;
  actressSlug: string;
  imageId: number | null;
  thumbnailUrl: string | null;
  hasHqImages?: boolean;
}

interface EraGridGalleryOptimizedProps {
  era: string;
  initialData: {
    success: boolean;
    items: GridItem[];
    count: number;
    era: string;
  } | null;
}

const POP_INTERVAL = 60; // 60ms = slower popping animation for better visibility
const ANIMATION_DELAY = 1500; // 1.5 seconds delay before starting animation

// Helper function to generate thumbnail URL
function getThumbnailUrl(imagePath: string | null): string {
  if (!imagePath) return '';
  
  // If it's already a full URL (Supabase storage URL), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's already an API URL, return as-is
  if (imagePath.includes('/api/')) {
    return imagePath;
  }
  
  // Use thumbnail API endpoint with square aspect ratio for grid
  const thumbnailSize = 200;
  return `/api/images/thumbnail?path=${encodeURIComponent(imagePath)}&width=${thumbnailSize}&height=${thumbnailSize}`;
}

export default function EraGridGalleryOptimized({ era, initialData }: EraGridGalleryOptimizedProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const popIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const startPopInAnimation = useCallback((itemsToShow: GridItem[]) => {
    // Clear any existing interval
    if (popIntervalRef.current) {
      clearInterval(popIntervalRef.current);
    }
    
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
  }, []);

  // Fallback: fetch client-side if no initial data
  useEffect(() => {
    if (!initialData) {
      fetch(`/api/grid/era/${era}`)
        .then(res => res.json())
        .then(result => {
          setData(result);
          setIsLoading(false);
          // Start pop-in animation after delay (gives time for scrolling on mobile)
          if (result.success && Array.isArray(result.items) && result.items.length > 0) {
            setTimeout(() => {
              startPopInAnimation(result.items);
            }, ANIMATION_DELAY);
          }
        })
        .catch(err => {
          console.error('Error fetching grid data:', err);
          setIsLoading(false);
        });
    } else {
      // We have initialData from server-side rendering
      setIsLoading(false);
      // Start pop-in animation for server-side rendered data after delay
      if (initialData.success && Array.isArray(initialData.items) && initialData.items.length > 0) {
        console.log(`[EraGridGalleryOptimized] Starting animation for ${initialData.items.length} items (era: ${era})`);
        setTimeout(() => {
          startPopInAnimation(initialData.items);
        }, ANIMATION_DELAY);
      } else {
        console.log(`[EraGridGalleryOptimized] No items to animate (era: ${era}, items: ${initialData.items?.length || 0})`);
      }
    }

    return () => {
      if (popIntervalRef.current) {
        clearInterval(popIntervalRef.current);
      }
    };
  }, [era, initialData, startPopInAnimation]);

  const items = data?.items || [];

  const handleClick = (item: GridItem, index: number) => {
    setModalIndex(index);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-[#1890ff] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600" style={{ fontFamily: 'var(--font-protest-strike)', fontSize: '14px' }}>
            Loading Gallery...
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to load gallery at this time</p>
          <p className="text-gray-500 text-sm">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No actresses with gallery images found for this era</p>
          <p className="text-gray-500 text-sm">Some actresses may not have gallery images available yet</p>
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
          // thumbnailUrl from API is already a full Supabase URL (gallery image)
          // We'll use it directly - Next.js Image will handle it
          // Note: API returns gallery image URL, not thumbnail, but it's okay for grid display
          const imageUrl = item.thumbnailUrl || null;
          const isVisible = visibleItems.has(index);
          
          return (
            <div
              key={`${item.actressId}-${item.imageId}-${index}`}
              className={`relative group cursor-pointer transition-all duration-300 hover:scale-105 ${
                isVisible 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-95'
              }`}
              style={{
                animation: isVisible ? 'popIn 0.3s ease-out' : 'none',
              }}
              onClick={() => handleClick(item, index)}
            >
              {/* Vintage rounded white frame with 4-5px border */}
              <div className="relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow" style={{ padding: '5px' }}>
                <div className="relative aspect-[3/4] bg-gray-100 rounded overflow-hidden">
                  {isVisible && imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`${item.actressName} - ${era} glamour girl`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 25vw, (max-width: 768px) 16.67vw, (max-width: 1024px) 12.5vw, (max-width: 1280px) 10vw, 8.33vw"
                      loading="lazy"
                      quality={85}
                      unoptimized={true} // Supabase URLs are already optimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      {!isVisible && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#1890ff] rounded-full animate-spin"></div>
                      )}
                      {isVisible && !imageUrl && (
                        <span className="text-gray-400 text-xs">No image</span>
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

      {/* Gallery Modal */}
      {items.length > 0 && (
        <EraGridGalleryModal
          items={items}
          initialIndex={modalIndex}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

