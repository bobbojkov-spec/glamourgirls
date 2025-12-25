'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '@/context/CartContext';
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
  const { addItem, isInCart, openCart } = useCart();

  const inCart = isInCart(image.id);

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

  const handleAddToCart = () => {
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
    
    // Don't open cart automatically - let user continue browsing
  };

  // Use full-size gallery image (not thumbnail)
  const imageSrc = image.fullUrl;

  // Render using portal to ensure it's at the root level
  const lightboxContent = (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center"
      onClick={(e) => {
        // Only close on click outside the image container
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ 
        zIndex: 9999,
        touchAction: 'none', // Prevent touch scrolling on mobile
        overscrollBehavior: 'contain', // Prevent scroll chaining
      }}
    >
      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded text-sm z-[10000]">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Close button - Top Right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="interactive-button absolute top-4 right-4 text-white hover:bg-white/20 z-[10000] bg-black/60 backdrop-blur-sm rounded-md px-4 py-2 shadow-lg font-medium"
        style={{ fontFamily: 'DM Sans, sans-serif', zIndex: 10000 }}
        aria-label="Close lightbox"
        title="Close (Esc)"
      >
        Close
      </button>

      <div
        className="relative w-full h-full flex items-center justify-center px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Arrow */}
        {images.length > 1 && (
          <button
            onClick={onPrev}
            className="interactive-icon absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-[10000] bg-black/70 hover:bg-black/90 rounded-full p-3 shadow-lg"
            style={{ zIndex: 10000 }}
            aria-label="Previous image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Image Container - ensures full image visibility */}
        <div className="relative flex items-center justify-center w-full h-full max-w-[90vw] max-h-[85vh]">
          <img
            src={imageSrc}
            alt={`${actressName} photo ${currentIndex + 1} of ${images.length}`}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            style={{ 
              objectFit: 'contain',
              maxWidth: '90vw',
              maxHeight: '85vh'
            }}
          />
        </div>

        {/* Next Arrow */}
        {images.length > 1 && (
          <button
            onClick={onNext}
            className="interactive-icon absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-[10000] bg-black/70 hover:bg-black/90 rounded-full p-3 shadow-lg"
            style={{ zIndex: 10000 }}
            aria-label="Next image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Photo info and purchase section - below image, only if HQ available */}
      {image.hasHQ && (
        <div 
          className="mt-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-[var(--shadow-subtle)] px-4 sm:px-6 py-3 sm:py-4 flex flex-row items-center justify-between gap-3 sm:gap-4 relative z-[10000] w-full max-w-[90vw] sm:max-w-none"
          onClick={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()} // Prevent touch scrolling on mobile
          style={{ 
            fontFamily: 'DM Sans, sans-serif', 
            zIndex: 10000,
            height: '64px', // Fixed height for all screen sizes
            minHeight: '64px',
            maxHeight: '64px',
            touchAction: 'none', // Prevent touch scrolling
          }}
        >
          {/* Left side: Pixel size, Megabyte size, and Price */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 text-[var(--text-secondary)] flex-1 min-w-0" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            {image.hqWidth && image.hqHeight && (
              <>
                <span className="font-medium whitespace-nowrap">{image.hqWidth} × {image.hqHeight} px</span>
                {image.fileSizeMB !== undefined && image.fileSizeMB !== null && (
                  <span className="font-medium whitespace-nowrap text-[var(--text-secondary)]/80">/ {image.fileSizeMB} MB</span>
                )}
                {image.price && (
                  <span className="font-semibold text-[var(--text-primary)] whitespace-nowrap ml-auto" style={{ fontSize: '16px' }}>
                    ${image.price.toFixed(2)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Right side: Add to Cart button (icon only, max 60px width) */}
          {image.price && (
            <div className="flex-shrink-0">
              {inCart ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCart();
                  }}
                  className="interactive-button inline-flex items-center justify-center bg-[var(--accent-gold)] text-white rounded-md hover:bg-[var(--accent-gold)]/90 hover:shadow-lg font-medium text-sm shadow-sm"
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                    height: '44px',
                    width: '44px',
                    minHeight: '44px',
                    minWidth: '44px',
                    maxHeight: '44px',
                    maxWidth: '60px',
                    padding: '0',
                    flexShrink: 0,
                  }}
                  aria-label="View cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
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
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart();
                  }}
                  className="interactive-button inline-flex items-center justify-center gap-2 bg-[var(--accent-gold)] text-white rounded-md hover:bg-[var(--accent-gold)]/90 hover:shadow-lg font-medium text-sm shadow-sm h-11 w-11 min-[500px]:w-auto min-[500px]:px-4"
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                    minHeight: '44px',
                    minWidth: '44px',
                    flexShrink: 0,
                  }}
                  aria-label="Add to cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
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
                  <span className="hidden min-[500px]:inline whitespace-nowrap">
                    Add to cart
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Use portal to render at document.body level
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(lightboxContent, document.body);
}


