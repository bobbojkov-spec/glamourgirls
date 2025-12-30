'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { GalleryImage } from './GalleryGrid';

interface LightboxProps {
  image: GalleryImage;
  images: GalleryImage[];
  currentIndex: number;
  actressId: string;
  actressName: string;
  actressSlug: string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export default function Lightbox({ 
  image, 
  images, 
  currentIndex, 
  actressId, 
  actressName,
  actressSlug,
  onNext, 
  onPrev,
  onClose 
}: LightboxProps) {
  const router = useRouter();
  const { addItem, isInCart, openCart } = useCart();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const inCart = isInCart(image.id);
  const isFavorited = isFavorite(actressId);

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

  const { firstName, surname } = splitName(actressName);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose]);

  // Prevent body scroll when lightbox is open (including mobile touch scrolling)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    
    // Prevent scrolling on all devices including mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${window.scrollY}px`;
    
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, []);

  // Touch/swipe handlers for mobile - same as EraGridGalleryModal
  const minSwipeDistance = 50;

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
        onNext();
      } else {
        onPrev();
      }
    }
    // Handle vertical swipes (up/down)
    else if (isUpSwipe || isDownSwipe) {
      if (isUpSwipe) {
        onNext();
      } else {
        onPrev();
      }
    }
  }, [touchStart, touchEnd, onPrev, onNext]);

  const handleNext = useCallback(() => {
    onNext();
  }, [onNext]);

  const handlePrevious = useCallback(() => {
    onPrev();
  }, [onPrev]);

  const handleViewDetails = useCallback(() => {
    onClose();
    router.push(`/actress/${actressId}/${actressSlug}`);
  }, [onClose, router, actressId, actressSlug]);

  const handleFavoriteClick = useCallback(() => {
    if (isFavorited) {
      removeFavorite(actressId);
    } else {
      addFavorite({
        id: actressId,
        name: actressName,
        slug: actressSlug,
        thumbnailUrl: image.thumbnailUrl,
      });
    }
  }, [isFavorited, addFavorite, removeFavorite, actressId, actressName, actressSlug, image.thumbnailUrl]);

  const handleAddToCart = useCallback(() => {
    if (!image.hasHQ || !image.price) return;
    
    addItem({
      id: image.id,
      actressId,
      actressName,
      actressSlug,
      thumbnailUrl: image.thumbnailUrl,
      price: image.price,
      width: image.hqWidth || image.width,
      height: image.hqHeight || image.height,
      fileSizeMB: image.fileSizeMB,
    });
  }, [image, actressId, actressName, actressSlug, addItem]);

  const isAlreadyInCart = isInCart(image.id);
  const isHQImage = image.hasHQ && !!image.price;
  
  // Use full-size gallery image (not thumbnail)
  const imageSrc = image.fullUrl;

  // Render using portal to ensure it's at the root level
  const lightboxContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
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

      {/* Main content - Fixed layout to prevent vertical jumps */}
      <div
        className="relative w-full h-full flex flex-col px-4 pt-8 md:pt-4 pb-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          justifyContent: 'flex-start',
        }}
      >
        {/* Image container - Fixed viewport height on mobile (70vh), same on desktop */}
        <div 
          className="relative w-full max-w-4xl mx-auto flex items-center justify-center bg-black mb-4 md:mb-6 h-[70vh] min-h-[70vh] max-h-[70vh]"
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
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
              src={imageSrc}
              alt={`${actressName} photo ${currentIndex + 1} of ${images.length}`}
              className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}
        </div>

        {/* Info panel - Fixed layout to prevent layout shift */}
        <div className="w-full max-w-4xl mx-auto">
          {/* Mobile: Same layout as desktop (no box) */}
          <div className="md:hidden w-full max-w-4xl mx-auto">
            {/* Actress name - centered, Cormorant Garamond, 24px, NOT all caps */}
            <div className="flex items-center justify-center mb-3">
              <h2 
                className="text-center"
                style={{ 
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: '24px',
                  fontWeight: 600, // SemiBold
                  letterSpacing: '0.01em',
                  textTransform: 'none',
                  lineHeight: '1.2',
                  color: '#ffffff',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                }}
                title={actressName}
              >
                {firstName} {surname}
              </h2>
            </div>

            {/* Info row - pixel size, price, add button - centered, 2px smaller - Fixed height to prevent layout shift */}
            <div className="flex items-center justify-center gap-4 mb-3" style={{ minHeight: '32px' }}>
              {/* Photo count (when image is NOT HQ) */}
              {!isHQImage && (
                <span className="text-white/90 text-[11px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {images.length} {images.length === 1 ? 'photo' : 'photos'}
                </span>
              )}
              
              {/* Pixel size and MB (when image IS HQ) */}
              {isHQImage && image.hqWidth && image.hqHeight && (
                <span className="text-white/90 text-[11px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {image.hqWidth.toLocaleString()} × {image.hqHeight.toLocaleString()} px
                  {image.fileSizeMB !== undefined && image.fileSizeMB !== null && ` / ${image.fileSizeMB} MB`}
                </span>
              )}
              
              {/* Price (when image IS HQ) */}
              {isHQImage && image.price && (
                <span className="font-semibold text-white text-xs" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  ${image.price.toFixed(2)}
                </span>
              )}
              
              {/* Add button (when image IS HQ) - Icon only */}
              {isHQImage && image.price && !isAlreadyInCart && (
                <button
                  onClick={handleAddToCart}
                  className="inline-flex items-center justify-center p-2 rounded-md font-medium text-white bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/90 hover:shadow-lg transition-all duration-200 shadow-sm active:scale-[0.95]"
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  aria-label="Add to cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </button>
              )}
              
              {/* In Cart button - Icon only */}
              {isHQImage && image.price && isAlreadyInCart && (
                <button
                  onClick={openCart}
                  className="inline-flex items-center justify-center p-2 rounded-md font-medium text-white bg-green-600 hover:bg-green-700 transition-all duration-200"
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  aria-label="View cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Actions row - See actress page and favorite - centered, 2px smaller */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleViewDetails}
                className="text-white hover:text-[var(--accent-gold)] transition-colors underline text-[11px] font-medium"
                style={{ 
                  fontFamily: 'DM Sans, sans-serif',
                }}
                title="See actress page"
              >
                See actress page →
              </button>
              
              {/* Favorite button */}
              <button
                onClick={handleFavoriteClick}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-opacity duration-200 border-2 border-white/30 hover:border-[var(--accent-gold)]"
                aria-label={isFavorited ? `Remove ${actressName} from favorites` : `Add ${actressName} to favorites`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={isFavorited ? '#8B4513' : 'none'}
                  stroke={isFavorited ? '#8B4513' : 'currentColor'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-opacity duration-200"
                  style={{ 
                    color: isFavorited ? '#8B4513' : 'white',
                  }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Image counter */}
            <div className="mt-4">
              <p className="text-white/60 text-xs text-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {currentIndex + 1} of {images.length}
              </p>
            </div>
          </div>

          {/* Desktop: Clean layout without background block, centered, matching image width */}
          <div className="hidden md:block w-full max-w-4xl mx-auto">
            {/* Actress name - centered, Cormorant Garamond, 24px, NOT all caps */}
            <div className="flex items-center justify-center mb-3">
              <h2 
                className="text-center"
                style={{ 
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: '24px',
                  fontWeight: 600, // SemiBold
                  letterSpacing: '0.01em',
                  textTransform: 'none',
                  lineHeight: '1.2',
                  color: '#ffffff',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)',
                }}
                title={actressName}
              >
                {firstName} {surname}
              </h2>
            </div>

            {/* Info row - pixel size, price, add button - centered, 2px smaller - Fixed height to prevent layout shift */}
            <div className="flex items-center justify-center gap-4 mb-3" style={{ minHeight: '32px' }}>
              {/* Photo count (when image is NOT HQ) */}
              {!isHQImage && (
                <span className="text-white/90 text-[11px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {images.length} {images.length === 1 ? 'photo' : 'photos'}
                </span>
              )}
              
              {/* Pixel size and MB (when image IS HQ) */}
              {isHQImage && image.hqWidth && image.hqHeight && (
                <span className="text-white/90 text-[11px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  {image.hqWidth.toLocaleString()} × {image.hqHeight.toLocaleString()} px
                  {image.fileSizeMB !== undefined && image.fileSizeMB !== null && ` / ${image.fileSizeMB} MB`}
                </span>
              )}
              
              {/* Price (when image IS HQ) */}
              {isHQImage && image.price && (
                <span className="font-semibold text-white text-xs" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  ${image.price.toFixed(2)}
                </span>
              )}
              
              {/* Add button (when image IS HQ) - Icon only */}
              {isHQImage && image.price && !isAlreadyInCart && (
                <button
                  onClick={handleAddToCart}
                  className="inline-flex items-center justify-center p-2 rounded-md font-medium text-white bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/90 hover:shadow-lg transition-all duration-200 shadow-sm active:scale-[0.95]"
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  aria-label="Add to cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </button>
              )}
              
              {/* In Cart button - Icon only */}
              {isHQImage && image.price && isAlreadyInCart && (
                <button
                  onClick={openCart}
                  className="inline-flex items-center justify-center p-2 rounded-md font-medium text-white bg-green-600 hover:bg-green-700 transition-all duration-200"
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  aria-label="View cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Actions row - See actress page and favorite - centered, 2px smaller */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleViewDetails}
                className="text-white hover:text-[var(--accent-gold)] transition-colors underline text-[11px] font-medium"
                style={{ 
                  fontFamily: 'DM Sans, sans-serif',
                }}
                title="See actress page"
              >
                See actress page →
              </button>
              
              {/* Favorite button */}
              <button
                onClick={handleFavoriteClick}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-opacity duration-200 border-2 border-white/30 hover:border-[var(--accent-gold)]"
                aria-label={isFavorited ? `Remove ${actressName} from favorites` : `Add ${actressName} to favorites`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={isFavorited ? '#8B4513' : 'none'}
                  stroke={isFavorited ? '#8B4513' : 'currentColor'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-opacity duration-200"
                  style={{ 
                    color: isFavorited ? '#8B4513' : 'white',
                  }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Image counter - Desktop */}
            <div className="mt-4">
              <p className="text-white/60 text-xs text-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {currentIndex + 1} of {images.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document.body level
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(lightboxContent, document.body);
}


