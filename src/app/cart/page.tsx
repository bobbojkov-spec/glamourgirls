'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import CartItem from '@/components/cart/CartItem';
import { Header, Footer } from '@/components/newdesign';
import '../newdesign/design-tokens.css';

export default function CartPage() {
  const router = useRouter();
  const { items, totalPrice, subtotal, discountRate, discountAmount, clearCart } = useCart();

  const handleCheckout = useCallback(() => {
    if (items.length === 0) {
      return;
    }
    
    // Save cart to localStorage before navigation
    try {
      const itemsJson = JSON.stringify(items);
      localStorage.setItem('hq_cart_items', itemsJson);
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
    
    router.push('/checkout');
  }, [items, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />
      <main className="flex-1 py-10 md:py-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-[var(--text-primary)] mb-2 uppercase"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                fontSize: 'clamp(15px, calc(15px + 0.268vw), 18px)',
                letterSpacing: '0.14em',
                lineHeight: 1.25,
              }}
            >
              Your Cart
            </h1>
            <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>
              {items.length === 0 
                ? 'Your cart is empty' 
                : `Review your ${items.length} ${items.length === 1 ? 'item' : 'items'} before checkout`}
            </p>
          </div>

          {items.length === 0 ? (
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-12 text-center">
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
                className="text-[var(--text-muted)] mb-6" 
                style={{ 
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--meta-size)',
                  lineHeight: 'var(--meta-line-height)',
                }}
              >
                Browse our galleries and add HQ photos to your cart
              </p>
              <Link 
                href="/search" 
                className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-medium tracking-wide uppercase text-[var(--text-primary)] transition-all duration-300 relative overflow-hidden group"
                style={{
                  backgroundColor: '#f6e5c0',
                  border: '1px solid #6f5718',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (window.innerWidth >= 768) {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.backgroundColor = '#fff5e1';
                    e.currentTarget.style.borderColor = '#8b6f2a';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
                  e.currentTarget.style.backgroundColor = '#f6e5c0';
                  e.currentTarget.style.borderColor = '#6f5718';
                }}
              >
                Browse Gallery
              </Link>
            </div>
          ) : (
            <>
              {/* Cart items */}
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-6 md:p-8 mb-6">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="border-b border-[var(--border-subtle)] last:border-b-0 pb-3 last:pb-0">
                      <CartItem item={item} />
                    </div>
                  ))}
                </div>

                {/* Footer with total and checkout */}
                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
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
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

