'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFavorites } from '@/context/FavoritesContext';

interface GridItem {
  actressId: number;
  actressName: string;
  actressSlug: string;
  imageId: number | null;
  thumbnailUrl: string | null;
  hasHqImages?: boolean;
}

interface EraGridGalleryModalProps {
  items: GridItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to get full-size image URL from thumbnail
// The API returns gallery image URLs (not thumbnails), so we can use them directly
function getFullImageUrl(thumbnailUrl: string | null): string {
  if (!thumbnailUrl) return '';
  
  // The API already returns full gallery image URLs from Supabase storage
  // So we can use them directly for the modal
  return thumbnailUrl;
}

export default function EraGridGalleryModal({
  items,
  initialIndex,
  isOpen,
  onClose,
}: EraGridGalleryModalProps) {
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const currentItem = items[currentIndex];
  const isFavorited = currentItem ? isFavorite(currentItem.actressId.toString()) : false;

  // Reset state when modal opens/closes or index changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setImageLoading(true);
      setImageError(false);
    }
  }, [isOpen, initialIndex]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : items.length - 1;
      setImageLoading(true);
      setImageError(false);
      return newIndex;
    });
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = prev < items.length - 1 ? prev + 1 : 0;
      setImageLoading(true);
      setImageError(false);
      return newIndex;
    });
  }, [items.length]);

  // Handle keyboard navigation (must be after handlePrevious and handleNext are defined)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrevious, handleNext, onClose]);

  const handleFavoriteClick = useCallback(() => {
    if (!currentItem) return;
    
    if (isFavorited) {
      removeFavorite(currentItem.actressId.toString());
    } else {
      addFavorite({
        id: currentItem.actressId.toString(),
        name: currentItem.actressName,
        slug: currentItem.actressSlug,
        thumbnailUrl: currentItem.thumbnailUrl || '',
      });
    }
  }, [currentItem, isFavorited, addFavorite, removeFavorite]);

  const handleViewDetails = useCallback(() => {
    if (!currentItem) return;
    router.push(`/actress/${currentItem.actressId}/${currentItem.actressSlug}`);
    onClose();
  }, [currentItem, router, onClose]);

  if (!isOpen || !currentItem) return null;

  const fullImageUrl = getFullImageUrl(currentItem.thumbnailUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Close gallery"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Navigation buttons */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrevious();
        }}
        className="absolute left-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Previous image"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className="absolute right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label="Next image"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Main content */}
      <div
        className="relative w-full h-full flex flex-col items-center justify-center px-4 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image container - Fixed 650px height */}
        <div className="relative w-full max-w-4xl h-[650px] flex items-center justify-center mb-6">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
          
          {imageError ? (
            <div className="flex flex-col items-center justify-center text-white/70">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mb-4"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p className="text-sm">Image not available</p>
            </div>
          ) : (
            <img
              src={fullImageUrl}
              alt={currentItem.actressName}
              className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                maxHeight: '650px',
                maxWidth: '100%',
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
        </div>

        {/* Info panel */}
        <div className="w-full max-w-4xl px-4">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
            {/* Actress name and favorite button */}
            <div className="flex items-center justify-between mb-3">
              <h2 
                className="text-lg font-bold text-white uppercase" 
                style={{ fontFamily: "'Kabel Black', sans-serif" }}
              >
                {currentItem.actressName}
              </h2>
              <button
                onClick={handleFavoriteClick}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 border-2 border-white/30 hover:border-[var(--accent-gold)] flex-shrink-0"
                aria-label={isFavorited ? `Remove ${currentItem.actressName} from favorites` : `Add ${currentItem.actressName} to favorites`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={isFavorited ? '#8B4513' : 'none'}
                  stroke={isFavorited ? '#8B4513' : 'currentColor'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-200"
                  style={{ 
                    color: isFavorited ? '#8B4513' : 'white',
                  }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* High-quality images notice */}
            {currentItem.hasHqImages && (
              <p className="text-white/70 text-xs mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                High-quality images are available
              </p>
            )}

            {/* View details link */}
            <button
              onClick={handleViewDetails}
              className="text-white hover:text-[var(--accent-gold)] transition-colors underline text-sm font-medium mb-2"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Go see details on this actress →
            </button>

            {/* Image counter */}
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-white/60 text-xs text-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {currentIndex + 1} of {items.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

