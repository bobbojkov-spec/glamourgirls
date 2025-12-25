'use client';

import { memo, useCallback } from 'react';
import Image from 'next/image';
import { useCart, CartItem as CartItemType } from '@/context/CartContext';

interface CartItemProps {
  item: CartItemType;
}

function CartItem({ item }: CartItemProps) {
  const { removeItem } = useCart();
  
  const handleRemove = useCallback(() => {
    removeItem(item.id);
  }, [removeItem, item.id]);

  return (
    <div className="interactive-row flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-surface-alt)] hover:shadow-sm border-b border-[var(--border-subtle)] last:border-b-0">
      {/* Thumbnail - Match ActressListRow exactly */}
      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
        <Image
          src={item.thumbnailUrl}
          alt={`${item.actressName} photo`}
          fill
          className="object-cover"
          sizes="64px"
          loading="lazy"
          unoptimized={item.thumbnailUrl.startsWith('http')}
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Actress Name - Match ActressListRow exactly */}
          <p className="text-base text-[var(--text-primary)] leading-tight uppercase font-bold truncate" style={{ fontFamily: "'Kabel Black', sans-serif" }}>
            {item.actressName}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1" style={{ fontFamily: 'var(--font-ui)' }}>
            {item.width} × {item.height} px
            {item.fileSizeMB !== undefined && item.fileSizeMB !== null && (
              <span className="text-[var(--text-muted)]/80"> / {item.fileSizeMB} MB</span>
            )}
          </p>
        </div>
        <p className={`${item.fileSizeMB !== undefined && item.fileSizeMB !== null ? 'text-base font-bold text-[var(--text-primary)]' : 'text-sm font-semibold text-[var(--text-primary)]'} mt-2`} style={{ fontFamily: 'var(--font-ui)' }}>
          ${item.price.toFixed(2)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={handleRemove}
        className="interactive-icon flex-shrink-0 text-[var(--text-muted)] hover:text-red-500 p-2"
        aria-label="Remove item"
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(CartItem);



