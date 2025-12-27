'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';

interface FeaturedPhotoProps {
  image: {
    id: number;
    displayUrl: string;
    downloadUrl: string;
    width?: number;
    height?: number;
    price?: number;
    fileSizeMB?: number;
  };
  actressId: string;
  actressName: string;
  actressSlug: string;
}

export default function FeaturedPhoto({ image, actressId, actressName, actressSlug }: FeaturedPhotoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { addItem, isInCart } = useCart();
  const isAlreadyInCart = isInCart(image.id.toString());

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!image.price) return;
    
    addItem({
      id: image.id.toString(),
      actressId,
      actressName,
      actressSlug,
      thumbnailUrl: image.displayUrl,
      price: image.price,
      width: image.width || 0,
      height: image.height || 0,
      fileSizeMB: image.fileSizeMB,
    });
    
    // Don't open cart - just add item silently
  };

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden group cursor-pointer md:cursor-pointer"
        style={{ 
          aspectRatio: '3/4', 
          width: '100%',
          // Ensure portrait: width calculated from height, never let width exceed height
          minHeight: 0,
          // Force container to respect aspect ratio strictly
          position: 'relative',
          borderRadius: '6px',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={image.displayUrl}
          alt={`Featured ${actressName} portrait`}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover',
            // Ensure image maintains portrait orientation
            maxWidth: '100%',
            borderRadius: '6px',
          }}
          loading="lazy"
        />
        {/* Desktop: Hover overlay with small icon-only button */}
        <div
          className={`hidden sm:flex absolute inset-0 bg-black/60 items-center justify-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {image.price && !isAlreadyInCart && (
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-white bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/90 hover:shadow-lg transition-all duration-200 shadow-sm active:scale-[0.95]"
              onClick={handleAddToCart}
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
          {isAlreadyInCart && (
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-white bg-white/20 border-2 border-white/50 hover:bg-white/30 transition-all duration-200"
              aria-label="In cart"
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
      </div>
      
      {/* Mobile/Tablet: Icon-only Add to Cart button below image */}
      {image.price && (
        <div className="sm:hidden flex justify-center">
          {!isAlreadyInCart ? (
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-white bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/90 hover:shadow-lg transition-all duration-200 shadow-sm active:scale-[0.95]"
              onClick={handleAddToCart}
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
          ) : (
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-white bg-white/20 border-2 border-white/50 hover:bg-white/30 transition-all duration-200"
              aria-label="In cart"
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
      )}
      {/* Image size, file size, and price - always two rows */}
      <div 
        className="flex flex-col items-center justify-center gap-0.5"
      >
        {image.width && image.height ? (
          <>
            {/* Row 1: Pixels / MB - smaller text */}
            <div className="flex items-center gap-1.5">
              <span 
                className="text-[var(--text-secondary)] whitespace-nowrap text-[11px]" 
                style={{ 
                  opacity: 0.8,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {image.width.toLocaleString()} × {image.height.toLocaleString()} px
              </span>
              {image.fileSizeMB !== undefined && image.fileSizeMB !== null && !isNaN(image.fileSizeMB) && (
                <span 
                  className="text-[var(--text-secondary)] whitespace-nowrap text-[11px]" 
                  style={{ 
                    opacity: 0.8,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  / {image.fileSizeMB} MB
                </span>
              )}
            </div>
            {/* Row 2: Price - 2px smaller */}
            {image.price && (
              <span 
                className="text-[var(--text-primary)] whitespace-nowrap font-semibold"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px', // 2px smaller than original 16px
                }}
              >
                ${image.price.toFixed(2)}
              </span>
            )}
          </>
        ) : image.price ? (
          <>
            {image.fileSizeMB !== undefined && image.fileSizeMB !== null && !isNaN(image.fileSizeMB) && (
              <span 
                className="text-[var(--text-secondary)] whitespace-nowrap text-[11px]" 
                style={{ 
                  opacity: 0.8,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                {image.fileSizeMB} MB
              </span>
            )}
            <span 
              className="text-[var(--text-primary)] whitespace-nowrap font-semibold"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px', // 2px smaller than original 16px
              }}
            >
              ${image.price.toFixed(2)}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

