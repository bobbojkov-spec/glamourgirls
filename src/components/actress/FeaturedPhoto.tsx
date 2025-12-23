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
        className="relative overflow-hidden rounded-lg border-[8px] border-white group cursor-pointer aspect-[4/5]"
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
        />
        {/* Hover overlay with Add to Cart button */}
        <div
          className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {image.price && !isAlreadyInCart && (
            <button
              className="px-6 py-3 rounded-lg font-medium tracking-wide uppercase text-sm text-white bg-[#1890ff] hover:bg-[#b8901f] transition-colors duration-200 shadow-lg"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          )}
          {isAlreadyInCart && (
            <div className="px-6 py-3 rounded-lg font-medium tracking-wide uppercase text-sm text-white bg-green-600">
              In Cart
            </div>
          )}
        </div>
      </div>
      {image.width && image.height && (
        <div className="flex items-center justify-center gap-2">
          <p className="text-[12px] text-[var(--text-secondary)] text-center">
            {image.width.toLocaleString()} × {image.height.toLocaleString()} px
          </p>
          {image.price && (
            <span className="text-[12px] text-[var(--text-primary)] font-semibold">
              • ${image.price.toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

