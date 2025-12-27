'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CartItem from './CartItem';
import ModalHeader from '@/components/ui/ModalHeader';

export default function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, closeCart, totalPrice, subtotal, discountRate, discountAmount, clearCart } = useCart();

  // Redirect to /cart page on mobile when modal tries to open, keep modal on desktop
  useEffect(() => {
    if (!isOpen) return;

    // Check if we're on mobile - if so, redirect to /cart page
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (isMobile) {
      closeCart();
      router.push('/cart');
      return;
    }
  }, [isOpen, closeCart, router]);

  // Handle ESC key to close (desktop only)
  useEffect(() => {
    if (!isOpen) return;
    // Only handle ESC on desktop
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    
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

  // Don't render modal on mobile (redirects to /cart page instead)
  if (!isOpen || (typeof window !== 'undefined' && window.innerWidth <= 768)) return null;

  return (
    <>
      {/* Backdrop - Same as favorites modal */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
        onClick={closeCart}
        aria-hidden="true"
      />
      
      {/* Modal - Same structure as favorites modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)] max-w-2xl w-full max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader 
            title="Your Cart" 
            onClose={closeCart}
            closeAriaLabel="Close cart"
          />

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
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
            <>
              {/* Cart items - Scrollable container - Same as favorites */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id}>
                      <CartItem item={item} />
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer with total and checkout */}
              <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex-shrink-0">
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
            </>
          )}
        </div>
      </div>
    </>
  );
}

