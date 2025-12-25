'use client';

import { useCart } from '@/context/CartContext';

export default function CartButton() {
  const { toggleCart, itemCount } = useCart();

  return (
    <button
      onClick={toggleCart}
      className="interactive-icon relative flex items-center gap-2 text-gray-300 hover:text-white"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      {/* Cart icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
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
      
      {/* Item count badge */}
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-[#1890ff] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </button>
  );
}




