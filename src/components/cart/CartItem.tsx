'use client';

import Image from 'next/image';
import { useCart, CartItem as CartItemType } from '@/context/CartContext';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { removeItem } = useCart();

  return (
    <div className="flex gap-4 py-4 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-surface-alt)] transition-colors px-2 -mx-2 rounded-md" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Thumbnail */}
      <div className="w-20 h-24 flex-shrink-0 bg-[var(--bg-surface-alt)] rounded-md overflow-hidden border border-[var(--border-subtle)] shadow-sm">
        <Image
          src={item.thumbnailUrl}
          alt={`${item.actressName} photo`}
          width={80}
          height={96}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate mb-1 uppercase" style={{ fontFamily: "'Kabel Black', sans-serif" }}>
            {item.actressName}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {item.width} × {item.height} px
          </p>
        </div>
        <p className="text-sm font-semibold text-[var(--accent-gold)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          ${item.price.toFixed(2)}
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={() => removeItem(item.id)}
        className="self-start text-[var(--text-muted)] hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50"
        aria-label="Remove item"
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
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}



