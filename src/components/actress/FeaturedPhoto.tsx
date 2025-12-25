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
}

export default function FeaturedPhoto({ image, actressId, actressName }: FeaturedPhotoProps) {
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
        className="relative overflow-hidden rounded-lg border-[8px] border-white group cursor-pointer md:cursor-pointer"
        style={{ aspectRatio: '4/5', width: '100%' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          // On mobile, don't trigger cart on image click - only on button click
          if (window.innerWidth >= 768) {
            handleAddToCart(e);
          }
        }}
      >
        <img
          src={image.displayUrl}
          alt={`Featured ${actressName} portrait`}
          className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
          style={{ aspectRatio: '4/5', width: '100%', height: '100%' }}
          loading="lazy"
        />
        {/* Desktop: Hover overlay with shopping cart icon only */}
        <div
          className={`hidden sm:flex absolute inset-0 bg-black/60 items-center justify-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {image.price && !isAlreadyInCart && (
            <button
              className="interactive-button inline-flex items-center justify-center w-10 h-10 rounded-full text-white bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/90 hover:shadow-lg shadow-sm"
              onClick={handleAddToCart}
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
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </button>
          )}
          {isAlreadyInCart && (
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white bg-green-600"
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
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile: Add to Cart button below image */}
      {image.price && (
        <div className="sm:hidden flex justify-center">
          {!isAlreadyInCart ? (
            <button
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm text-white bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/90 hover:shadow-lg transition-all duration-200 shadow-sm active:scale-[0.92] active:shadow-md active:opacity-80"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
              }}
              onClick={handleAddToCart}
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
              <span>Add to Cart</span>
            </button>
          ) : (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm text-white bg-green-600"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
              }}
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
              <span>In Cart</span>
            </div>
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
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-[var(--text-secondary)] whitespace-nowrap" style={{ opacity: 0.8 }}>
                {image.width.toLocaleString()} × {image.height.toLocaleString()} px
              </span>
              {image.fileSizeMB !== undefined && image.fileSizeMB !== null && !isNaN(image.fileSizeMB) && (
                <span className="text-[var(--text-secondary)] whitespace-nowrap" style={{ opacity: 0.8 }}>
                  / {image.fileSizeMB} MB
                </span>
              )}
            </div>
            {/* Row 2: Price */}
            {image.price && (
              <span className="text-[var(--text-primary)] font-semibold whitespace-nowrap text-[12px]">
                ${image.price.toFixed(2)}
              </span>
            )}
          </>
        ) : image.price ? (
          <>
            {image.fileSizeMB !== undefined && image.fileSizeMB !== null && !isNaN(image.fileSizeMB) && (
              <span className="text-[var(--text-secondary)] whitespace-nowrap text-[11px]" style={{ opacity: 0.8 }}>
                {image.fileSizeMB} MB
              </span>
            )}
            <span className="text-[var(--text-primary)] font-semibold whitespace-nowrap text-[12px]">
              ${image.price.toFixed(2)}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

