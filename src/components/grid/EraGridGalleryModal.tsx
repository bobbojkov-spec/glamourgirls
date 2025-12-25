'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';

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

interface HqImageInfo {
  width: number;
  height: number;
  price: number;
  imageId: string;
}

export default function EraGridGalleryModal({
  items,
  initialIndex,
  isOpen,
  onClose,
}: EraGridGalleryModalProps) {
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { addItem, isInCart, openCart } = useCart();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [hqImageInfo, setHqImageInfo] = useState<HqImageInfo | null>(null);
  const [loadingHqInfo, setLoadingHqInfo] = useState(false);
  const [hasOtherHqImages, setHasOtherHqImages] = useState(false);

  const currentItem = items[currentIndex];
  const isFavorited = currentItem ? isFavorite(currentItem.actressId.toString()) : false;

  // Split name into first name and surname
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], surname: '' };
    }
    return {
      firstName: parts[0],
      surname: parts.slice(1).join(' '),
    };
  };

  const { firstName, surname } = currentItem ? splitName(currentItem.actressName) : { firstName: '', surname: '' };

  // Fetch HQ image info when current item changes
  useEffect(() => {
    const fetchHqImageInfo = async () => {
      if (!currentItem) {
        setHqImageInfo(null);
        setHasOtherHqImages(false);
        return;
      }

      setLoadingHqInfo(true);
      try {
        const response = await fetch(`/api/actresses/${currentItem.actressId}`);
        if (response.ok) {
          const actressData = await response.json();
          const galleryImages = actressData.images?.gallery || [];
          const hqImages = actressData.images?.hq || [];
          
          // Check if there are any HQ images for this actress
          const hasAnyHqImages = hqImages.length > 0 && hqImages.some((hq: any) => {
            if (!hq.width || !hq.height) return false;
            const longSide = Math.max(hq.width, hq.height);
            return longSide >= 1200;
          });
          
          // Find the gallery image that matches current image
          const galleryImage = galleryImages.find((img: any) => 
            img.id.toString() === currentItem.imageId?.toString()
          );
          
          if (galleryImage) {
            // Find corresponding HQ image (usually galleryId - 1 or + 1)
            const galleryId = parseInt(galleryImage.id);
            const hqImage = hqImages.find((hq: any) => 
              parseInt(hq.id) === galleryId - 1 || parseInt(hq.id) === galleryId + 1
            );
            
            // Check if HQ image meets minimum requirements (1200px on long side)
            if (hqImage && hqImage.width && hqImage.height) {
              const longSide = Math.max(hqImage.width, hqImage.height);
              if (longSide >= 1200) {
                setHqImageInfo({
                  width: hqImage.width,
                  height: hqImage.height,
                  price: 9.9,
                  imageId: galleryImage.id.toString(), // Use gallery ID for cart consistency
                });
                setHasOtherHqImages(false);
                return;
              }
            }
          }
          
          // If current image doesn't have HQ but other images do
          if (hasAnyHqImages) {
            setHasOtherHqImages(true);
          } else {
            setHasOtherHqImages(false);
          }
          
          setHqImageInfo(null);
        } else {
          setHqImageInfo(null);
          setHasOtherHqImages(false);
        }
      } catch (error) {
        console.error('Error fetching HQ image info:', error);
        setHqImageInfo(null);
        setHasOtherHqImages(false);
      } finally {
        setLoadingHqInfo(false);
      }
    };

    if (isOpen && currentItem) {
      fetchHqImageInfo();
    }
  }, [isOpen, currentItem?.actressId, currentItem?.imageId, currentItem?.hasHqImages]);

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

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem || !hqImageInfo) return;
    
    addItem({
      id: hqImageInfo.imageId,
      actressId: currentItem.actressId.toString(),
      actressName: currentItem.actressName,
      actressSlug: currentItem.actressSlug,
      thumbnailUrl: currentItem.thumbnailUrl || '',
      price: hqImageInfo.price,
      width: hqImageInfo.width,
      height: hqImageInfo.height,
    });
    
    openCart();
  }, [currentItem, hqImageInfo, addItem, openCart]);

  const isAlreadyInCart = hqImageInfo ? isInCart(hqImageInfo.imageId) : false;

  // Touch/swipe handlers for mobile
  const minSwipeDistance = 50; // Minimum distance for a swipe

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    // Handle horizontal swipes (left/right)
    if (isLeftSwipe || isRightSwipe) {
      if (isLeftSwipe) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
    // Handle vertical swipes (up/down)
    else if (isUpSwipe || isDownSwipe) {
      if (isUpSwipe) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  }, [touchStart, touchEnd, handlePrevious, handleNext]);

  if (!isOpen || !currentItem) return null;

  const fullImageUrl = getFullImageUrl(currentItem.thumbnailUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button - Overlay on image corner for mobile */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 md:top-4 md:right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 md:bg-white/10 hover:bg-black/70 md:hover:bg-white/20 transition-colors text-white"
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

      {/* Navigation buttons - Bigger with black overlay on mobile */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrevious();
        }}
        className="absolute left-2 md:left-4 z-20 w-14 h-14 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/50 md:bg-white/10 hover:bg-black/70 md:hover:bg-white/20 transition-colors text-white active:scale-95"
        aria-label="Previous image"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="md:w-6 md:h-6"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className="absolute right-2 md:right-4 z-20 w-14 h-14 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/50 md:bg-white/10 hover:bg-black/70 md:hover:bg-white/20 transition-colors text-white active:scale-95"
        aria-label="Next image"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="md:w-6 md:h-6"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Main content */}
      <div
        className="relative w-full h-full flex flex-col items-center justify-center px-4 pt-8 md:pt-4 pb-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Image container - Fixed 650px height, higher on mobile */}
        <div className="relative w-full max-w-4xl h-[650px] flex items-center justify-center mb-4 md:mb-6">
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
            {/* First row: Actress name */}
            <div className="mb-3">
              <h2 
                className="font-bold text-white uppercase leading-tight" 
                style={{ 
                  fontFamily: "'Kabel Black', sans-serif",
                  fontSize: '0.8em',
                  opacity: 1,
                }}
              >
                {firstName && (
                  <div className="block">{firstName}</div>
                )}
                {surname && (
                  <div className="block">{surname}</div>
                )}
                {!firstName && !surname && currentItem.actressName && (
                  <>
                    <div className="block">{currentItem.actressName.split(' ')[0]}</div>
                    {currentItem.actressName.split(' ').slice(1).length > 0 && (
                      <div className="block">{currentItem.actressName.split(' ').slice(1).join(' ')}</div>
                    )}
                  </>
                )}
              </h2>
            </div>

            {/* Second row: HQ available, pixel size, price, and Add button (if HQ available) */}
            {hqImageInfo && !loadingHqInfo && (
              <div className="flex items-center justify-between mb-3 gap-4">
                <div className="flex items-center gap-2 text-white/90 flex-1" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem' }}>
                  <span>HQ available</span>
                  <span>•</span>
                  <span>{hqImageInfo.width.toLocaleString()} × {hqImageInfo.height.toLocaleString()} px</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold text-white text-base" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    ${hqImageInfo.price.toFixed(2)}
                  </span>
                  {!isAlreadyInCart ? (
                    <button
                      onClick={handleAddToCart}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs text-white bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/90 hover:shadow-lg transition-all duration-200 shadow-sm active:scale-[0.95]"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                      <span>Add</span>
                    </button>
                  ) : (
                    <button
                      onClick={openCart}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs text-white bg-green-600"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>In Cart</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Show "HiQ images available" if current image doesn't have HQ but other images do */}
            {!hqImageInfo && !loadingHqInfo && hasOtherHqImages && (
              <div className="mb-3">
                <p className="text-white/90 text-sm" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  HiQ images available
                </p>
              </div>
            )}

            {/* Third row: View details link (left) and Favorite button (right) */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleViewDetails}
                className="text-white hover:text-[var(--accent-gold)] transition-colors underline text-sm font-medium"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                {currentItem.actressName.split(' ').length > 1 ? 'See details on this actress' : 'Go to details'} →
              </button>
              
              {/* Favorite button */}
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

