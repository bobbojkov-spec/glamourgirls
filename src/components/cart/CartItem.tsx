'use client';

import { memo, useCallback } from 'react';
import { useCart, CartItem as CartItemType } from '@/context/CartContext';
import ActressListRow from '@/components/ui/ActressListRow';

interface CartItemProps {
  item: CartItemType;
}

function CartItem({ item }: CartItemProps) {
  const { removeItem } = useCart();
  
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeItem(item.id);
  }, [removeItem, item.id]);

  return (
    <div className="border-b border-[var(--border-subtle)] last:border-b-0">
      <ActressListRow
        id={item.actressId}
        name={item.actressName}
        slug={item.actressSlug}
        thumbnailUrl={item.thumbnailUrl}
        nonClickable={true}
        additionalContent={
          <div className="flex items-center justify-between mt-1">
            <p 
              className="text-xs text-[var(--text-muted)]" 
              style={{ 
                fontFamily: 'var(--font-ui)',
                fontSize: 'var(--meta-size)',
                lineHeight: 'var(--meta-line-height)',
              }}
            >
              {item.width} × {item.height} px
              {item.fileSizeMB !== undefined && item.fileSizeMB !== null && (
                <span className="text-[var(--text-muted)]/80"> / {item.fileSizeMB} MB</span>
              )}
            </p>
            <p 
              className={`${item.fileSizeMB !== undefined && item.fileSizeMB !== null ? 'text-base font-bold' : 'text-sm font-semibold'} text-[var(--text-primary)]`} 
              style={{ 
                fontFamily: 'var(--font-ui)',
              }}
            >
              ${item.price.toFixed(2)}
            </p>
          </div>
        }
        actionButton={
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
        }
      />
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(CartItem);



