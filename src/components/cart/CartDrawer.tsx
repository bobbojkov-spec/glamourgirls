'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import CartItem from './CartItem';

export default function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, closeCart, totalPrice, subtotal, discountRate, discountAmount, clearCart } = useCart();

  if (!isOpen) return null;

  const handleCheckout = () => {
    console.log('Proceeding to checkout with items:', items.length);
    console.log('Items:', items);
    
    // Save cart to localStorage before navigation
    const itemsJson = JSON.stringify(items);
    localStorage.setItem('hq_cart_items', itemsJson);
    console.log('Saved to localStorage:', itemsJson.length, 'characters');
    
    // Verify it was saved
    const verify = localStorage.getItem('hq_cart_items');
    console.log('Verified localStorage:', verify ? 'saved successfully' : 'FAILED');
    
    // Navigate to checkout
    router.push('/checkout');
    closeCart();
  };

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
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
          <h2 className="text-[var(--text-3xl)] text-[var(--text-primary)]" style={{ 
            fontFamily: 'var(--font-vintage-headline)', 
            letterSpacing: '0.06em',
            lineHeight: '1.2',
            textTransform: 'uppercase'
          }}>
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
              <span className="text-xl font-bold text-[var(--accent-gold)]">
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCheckout}
                className="w-full bg-[var(--accent-gold)] text-white py-3.5 px-4 rounded-md font-medium text-sm hover:bg-[var(--accent-gold)]/90 transition-all duration-200 shadow-sm hover:shadow-md"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
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

