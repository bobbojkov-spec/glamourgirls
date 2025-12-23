'use client';

import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { GalleryImage } from './GalleryGrid';

interface LightboxProps {
  image: GalleryImage;
  images: GalleryImage[];
  currentIndex: number;
  actressId: string;
  actressName: string;
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

  const handleAddToCart = () => {
    if (!image.hasHQ || !image.price) return;
    
    addItem({
      id: image.id,
      actressId,
      actressName,
      thumbnailUrl: image.thumbnailUrl,
      price: image.price,
      width: image.hqWidth || image.width,
      height: image.hqHeight || image.height,
    });
    
    openCart();
  };

  // Use full-size gallery image (not thumbnail)
  const imageSrc = image.fullUrl;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[1000] flex flex-col items-center justify-center"
      onClick={(e) => {
        // Only close on click outside the image container
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded text-sm z-[1001]">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Close button - Top Right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 text-white hover:bg-white/20 transition-all duration-200 z-[1001] bg-black/60 backdrop-blur-sm rounded-md px-4 py-2 shadow-lg font-medium"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
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
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-[1001] bg-black/70 hover:bg-black/90 rounded-full p-3 shadow-lg"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-[1001] bg-black/70 hover:bg-black/90 rounded-full p-3 shadow-lg"
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
          className="mt-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-[var(--shadow-subtle)] px-6 py-4 flex items-center justify-between gap-6"
          onClick={(e) => e.stopPropagation()}
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          <div className="flex items-center gap-4 text-[var(--text-secondary)]" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
            {image.hqWidth && image.hqHeight && (
              <span className="font-medium">{image.hqWidth} × {image.hqHeight} px</span>
            )}
            {image.price && (
              <span className="font-semibold text-[var(--text-primary)]" style={{ fontSize: '16px' }}>
                ${image.price.toFixed(2)}
              </span>
            )}
          </div>

          {image.price && (
            <div>
              {inCart ? (
                <button
                  onClick={openCart}
                  className="px-5 py-2.5 bg-[var(--accent-gold)] text-white rounded-md flex items-center gap-2 hover:bg-[var(--accent-gold)]/90 transition-all duration-200 font-medium text-sm shadow-sm"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  In Cart
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="px-5 py-2.5 bg-[var(--accent-gold)] text-white rounded-md flex items-center gap-2 hover:bg-[var(--accent-gold)]/90 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
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
                  Add to Cart
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


