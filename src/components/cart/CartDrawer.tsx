'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CartItem from './CartItem';

export default function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, closeCart, totalPrice, subtotal, discountRate, discountAmount, clearCart } = useCart();

  const handleCheckout = useCallback(() => {
    if (items.length === 0) {
      return;
    }
    
    // Save cart to localStorage before navigation (non-blocking)
    try {
      const itemsJson = JSON.stringify(items);
      localStorage.setItem('hq_cart_items', itemsJson);
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
    
    // Close cart and navigate immediately (no delay needed)
    closeCart();
    router.push('/checkout');
  }, [items, closeCart, router]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[998] transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--bg-surface)] shadow-[var(--shadow-lift)] z-[999] flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 mb-6 border-b border-[var(--border-subtle)] pb-5">
          <h2
            className="text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: 'var(--h2-size)',
              letterSpacing: 'var(--h2-letter-spacing)',
              lineHeight: 'var(--h2-line-height)',
            }}
          >
            Your Cart
          </h2>
          <button
            onClick={closeCart}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1.5 rounded-md hover:bg-[var(--state-hover-wash)]"
            aria-label="Close cart"
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

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[var(--text-secondary)] mb-2 font-medium" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px' }}>
                Your cart is empty
              </p>
              <p className="text-sm text-[var(--text-muted)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                Browse our galleries and add HQ photos to your cart
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer with total and checkout */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
            {/* Subtotal */}
            <div className="flex items-center justify-between mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              <span className="text-sm text-[var(--text-secondary)]">Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            
            {/* Discount */}
            {discountRate > 0 && (
              <div className="flex items-center justify-between mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                <span className="text-sm text-green-700 font-medium">
                  Discount ({Math.round(discountRate * 100)}%)
                </span>
                <span className="text-sm text-green-700 font-semibold">
                  -${discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            
            {/* Total */}
            <div className="flex items-center justify-between mb-5 pt-3 border-t border-[var(--border-subtle)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              <span className="text-base font-semibold text-[var(--text-primary)]">Total</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCheckout}
                className="w-full py-3.5 px-4 rounded-lg font-medium text-sm tracking-wide uppercase transition-all duration-300 relative overflow-hidden group"
                style={{
                  backgroundColor: '#f6e5c0',
                  border: '1px solid #6f5718',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                  fontFamily: 'DM Sans, sans-serif',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.backgroundColor = '#fff5e1';
                  e.currentTarget.style.borderColor = '#8b6f2a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.backgroundColor = '#f6e5c0';
                  e.currentTarget.style.borderColor = '#6f5718';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)';
                }}
              >
                Proceed to Checkout
              </button>
              <button
                onClick={clearCart}
                className="w-full text-sm text-[var(--text-muted)] hover:text-red-600 transition-colors py-2 font-medium"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

