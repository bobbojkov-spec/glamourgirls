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
  };
  actressId: string;
  actressName: string;
}

export default function FeaturedPhoto({ image, actressId, actressName }: FeaturedPhotoProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { addItem, openCart, isInCart } = useCart();
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
    });
    
    openCart();
  };

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden rounded-lg border-[8px] border-white group cursor-pointer"
        style={{ aspectRatio: '4/5', width: '100%' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleAddToCart}
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
        {/* Hover overlay with Add to Cart button */}
        <div
          className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {image.price && !isAlreadyInCart && (
            <button
              className="w-[80%] max-w-[80%] py-[8%] rounded-lg font-medium tracking-wide uppercase text-white bg-[#1890ff] hover:bg-[#b8901f] transition-colors duration-200 shadow-lg"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 'clamp(10px, 4vw, 14px)',
              }}
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          )}
          {isAlreadyInCart && (
            <div className="w-[80%] max-w-[80%] py-[8%] rounded-lg font-medium tracking-wide uppercase text-white bg-green-600"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 'clamp(10px, 4vw, 14px)',
              }}
            >
              In Cart
            </div>
          )}
        </div>
      </div>
      {/* Image size and price - single line, no breaks, 1px smaller on desktop */}
      <div 
        className="flex items-center justify-center gap-1.5 overflow-hidden text-[12px] lg:text-[11px] whitespace-nowrap"
      >
        {image.width && image.height ? (
          <>
            <span className="text-[var(--text-secondary)] whitespace-nowrap">
              {image.width.toLocaleString()} × {image.height.toLocaleString()} px
            </span>
            {image.price && (
              <span className="text-[var(--text-primary)] font-semibold whitespace-nowrap">
                • ${image.price.toFixed(2)}
              </span>
            )}
          </>
        ) : image.price ? (
          <span className="text-[var(--text-primary)] font-semibold whitespace-nowrap">
            ${image.price.toFixed(2)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

