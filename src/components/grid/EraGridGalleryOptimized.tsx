'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface GridItem {
  actressId: number;
  actressName: string;
  actressSlug: string;
  imageId: number | null;
  thumbnailUrl: string | null;
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

// Helper function to generate thumbnail URL using the API endpoint
function getThumbnailUrl(imagePath: string | null): string {
  if (!imagePath) return '';
  
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

  // Fallback: fetch client-side if no initial data
  useEffect(() => {
    if (!initialData) {
      fetch(`/api/grid/era/${era}`)
        .then(res => res.json())
        .then(result => {
          setData(result);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching grid data:', err);
          setIsLoading(false);
        });
    }
  }, [era, initialData]);

  const items = data?.items || [];

  const handleClick = (item: GridItem) => {
    router.push(`/actress/${item.actressId}/${item.actressSlug}`);
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
          <p className="text-gray-600 mb-2">Error loading gallery</p>
          <p className="text-gray-500 text-sm">Please try again later</p>
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
          const thumbnailUrl = item.thumbnailUrl ? getThumbnailUrl(item.thumbnailUrl) : null;
          
          return (
            <div
              key={`${item.actressId}-${item.imageId}-${index}`}
              className="relative group cursor-pointer transition-all duration-300 hover:scale-105"
              onClick={() => handleClick(item)}
            >
              {/* Vintage rounded white frame with 4-5px border */}
              <div className="relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow" style={{ padding: '5px' }}>
                <div className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={`${item.actressName} - ${era} glamour girl`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 25vw, (max-width: 768px) 16.67vw, (max-width: 1024px) 12.5vw, (max-width: 1280px) 10vw, 8.33vw"
                      loading={index < 32 ? 'eager' : 'lazy'} // Eager load first 32 images
                      quality={85}
                      unoptimized={thumbnailUrl.includes('/api/')} // API handles optimization
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No image</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hover overlay with actress name */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none z-10" style={{ padding: '5px' }}>
                <p className="text-white text-[10px] font-bold text-center px-1 leading-tight uppercase" style={{ fontFamily: "'Kabel Black', sans-serif" }}>
                  {item.actressName}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

