'use client';

import { useState } from 'react';
import { GalleryImage } from './GalleryGrid';

interface GalleryItemProps {
  image: GalleryImage;
  onClick: () => void;
  theirMan?: boolean;
}

export default function GalleryItem({ image, onClick, theirMan }: GalleryItemProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Use fixed aspect ratio for consistent thumbnails (3:4 portrait)
  // Source thumbnails are 250px height, but we display at max 200px
  const aspectRatio = 3/4;
  const displayHeight = 200;
  const displayWidth = Math.round(displayHeight * aspectRatio);
  
  // Use thumbnailUrl if available (should be 250px height), otherwise generate from fullUrl
  // If thumbnailUrl exists and is a full URL (starts with http), use it directly
  // If thumbnailUrl is a local path, use it directly (it's already optimized at 250px)
  // Otherwise, generate on-the-fly at 200px for display via thumbnail API
  const initialImageSrc = image.thumbnailUrl && image.thumbnailUrl.startsWith('http') 
    ? image.thumbnailUrl  // Full URL - use directly
    : image.thumbnailUrl || 
      (image.fullUrl && !image.fullUrl.startsWith('http')
        ? `/api/images/thumbnail?path=${encodeURIComponent(image.fullUrl)}&width=${displayWidth}&height=${displayHeight}` 
        : image.fullUrl || null);
  
  const currentSrc = imgSrc || initialImageSrc || (theirMan ? '/images/placeholder-man-portrait.png' : null);

  const handleError = () => {
    if (!hasError && theirMan) {
      setHasError(true);
      setImgSrc('/images/placeholder-man-portrait.png');
    } else if (!hasError) {
      setHasError(true);
      // Hide broken image for non-their-men entries
      setImgSrc(null);
    }
  };

  return (
    <div
      className="gallery-thumb group relative"
      onClick={onClick}
    >
      <div 
        className="relative w-full bg-gray-100 overflow-hidden" 
        style={{ aspectRatio: '3/4', width: '100%', height: 'auto' }}
      >
        {currentSrc ? (
          <img
            src={currentSrc}
            alt="Gallery photo"
            className="w-full h-full object-cover"
            style={{ aspectRatio: '3/4', width: '100%', height: '100%' }}
            loading="lazy"
            onError={handleError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-xs">No preview</span>
          </div>
        )}
        
        {/* HQ Available overlay */}
        {image.hasHQ && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-[#1890ff] text-white text-xs font-bold px-2 py-1 rounded">
              HQ Available
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


