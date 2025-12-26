'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CartItem from './CartItem';

export default function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, closeCart, totalPrice, subtotal, discountRate, discountAmount, clearCart } = useCart();

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCart();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeCart]);

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
      {/* Backdrop - lighter on desktop, darker on mobile */}
      <div
        className="fixed inset-0 bg-black/20 md:bg-black/30 z-[998] transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Mini-Cart Dropdown - Desktop: top-right dropdown, Mobile: bottom drawer */}
      <div 
        className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-auto md:top-4 w-full md:w-[360px] md:max-h-[calc(100vh-20px)] bg-[var(--bg-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.15)] md:rounded-lg md:border md:border-[var(--border-subtle)] z-[999] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <h2 
            className="uppercase text-[var(--text-primary)]"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: 'clamp(15px, calc(15px + 0.268vw), 18px)',
              letterSpacing: '0.14em',
              lineHeight: 1.25,
            }}
          >
            Your Cart
          </h2>
          <button
            onClick={closeCart}
            className="interactive-icon text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--state-hover-wash)] p-1.5"
            aria-label="Close cart"
          >
            <svg 
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

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <p 
                  className="text-[var(--text-secondary)] mb-2 font-medium" 
                  style={{ 
                    fontFamily: 'var(--font-ui)', 
                    fontSize: 'var(--body-size)',
                    lineHeight: 'var(--body-line-height)',
                  }}
                >
                  Your cart is empty
                </p>
                <p 
                  className="text-[var(--text-muted)]" 
                  style={{ 
                    fontFamily: 'var(--font-ui)',
                    fontSize: 'var(--meta-size)',
                    lineHeight: 'var(--meta-line-height)',
                  }}
                >
                  Browse our galleries and add HQ photos to your cart
                </p>
              </div>
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
          <div className="px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex-shrink-0">
            {/* Subtotal */}
            <div className="flex items-center justify-between mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
              <span 
                className="text-[var(--text-secondary)]" 
                style={{ 
                  fontSize: 'var(--meta-size)',
                  lineHeight: 'var(--meta-line-height)',
                }}
              >
                Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
              <span 
                className="font-medium text-[var(--text-primary)]" 
                style={{ 
                  fontSize: 'var(--meta-size)',
                  lineHeight: 'var(--meta-line-height)',
                }}
              >
                ${subtotal.toFixed(2)}
              </span>
            </div>
            
            {/* Discount */}
            {discountRate > 0 && (
              <div className="flex items-center justify-between mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
                <span 
                  className="text-green-700 font-medium" 
                  style={{ 
                    fontSize: 'var(--meta-size)',
                    lineHeight: 'var(--meta-line-height)',
                  }}
                >
                  Discount ({Math.round(discountRate * 100)}%)
                </span>
                <span 
                  className="text-green-700 font-semibold" 
                  style={{ 
                    fontSize: 'var(--meta-size)',
                    lineHeight: 'var(--meta-line-height)',
                  }}
                >
                  -${discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            
            {/* Total */}
            <div className="flex items-center justify-between mb-5 pt-3 border-t border-[var(--border-subtle)]" style={{ fontFamily: 'var(--font-ui)' }}>
              <span 
                className="font-semibold text-[var(--text-primary)]" 
                style={{ 
                  fontSize: 'var(--body-size)',
                  lineHeight: 'var(--body-line-height)',
                }}
              >
                Total
              </span>
              <span 
                className="font-bold text-[var(--text-primary)]" 
                style={{ 
                  fontSize: 'var(--h3-size)',
                  lineHeight: 'var(--h3-line-height)',
                }}
              >
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCheckout}
                className="interactive-button w-full py-3.5 px-4 rounded-lg font-medium tracking-wide uppercase relative overflow-hidden group"
                style={{
                  backgroundColor: '#f6e5c0',
                  border: '1px solid #6f5718',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--meta-size)',
                  lineHeight: 'var(--meta-line-height)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (window.innerWidth >= 768) {
                    e.currentTarget.style.backgroundColor = '#fff5e1';
                    e.currentTarget.style.borderColor = '#8b6f2a';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f6e5c0';
                  e.currentTarget.style.borderColor = '#6f5718';
                }}
              >
                Proceed to Checkout
              </button>
              <button
                onClick={clearCart}
                className="interactive-link w-full text-[var(--text-muted)] hover:text-red-600 py-2 font-medium"
                style={{ 
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--meta-size)',
                  lineHeight: 'var(--meta-line-height)',
                }}
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

