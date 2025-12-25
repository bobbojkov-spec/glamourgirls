'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Header, Footer } from '@/components/newdesign';
import '../newdesign/design-tokens.css';

interface CartItem {
  imageId: string;
  actressId: string;
  actressName: string;
  imageUrl: string;
  thumbnailUrl: string;
  price: number;
  width?: number;
  height?: number;
  fileSizeMB?: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items: cartContextItems } = useCart();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get cart from localStorage (saved by cart drawer) or cart context
    const loadCart = async () => {
      try {
        let cartItems: any[] = [];
        
        // Priority 1: localStorage (saved by cart drawer when clicking "Proceed to Checkout")
        const savedCart = localStorage.getItem('hq_cart_items');
        if (savedCart) {
          try {
            const parsed = JSON.parse(savedCart);
            cartItems = Array.isArray(parsed) ? parsed : [];
            console.log('Loaded cart from localStorage:', cartItems.length, 'items');
          } catch (e) {
            console.error('Error parsing saved cart:', e);
          }
        }
        
        // Priority 2: Cart context (if localStorage is empty)
        if (cartItems.length === 0 && cartContextItems && cartContextItems.length > 0) {
          console.log('Using cart context items:', cartContextItems.length);
          cartItems = cartContextItems;
          // Also save to localStorage for consistency
          localStorage.setItem('hq_cart_items', JSON.stringify(cartContextItems));
        }

        if (cartItems.length === 0) {
          console.log('No cart items found. Context:', cartContextItems?.length || 0, 'localStorage:', savedCart ? 'exists' : 'empty');
          setLoading(false);
          return;
        }

        console.log('Processing cart items:', cartItems.length);

        // Convert cart items to checkout format
        // Use cart items directly, fetch full URLs if needed
        const cartData: CartItem[] = await Promise.all(
          cartItems.map(async (item: any) => {
            // Basic conversion - use existing data
            const baseItem: CartItem = {
              imageId: item.id || item.imageId || '',
              actressId: item.actressId || '',
              actressName: item.actressName || '',
              imageUrl: item.thumbnailUrl || item.imageUrl || '',
              thumbnailUrl: item.thumbnailUrl || '',
              price: item.price || 0,
            };

            // Try to fetch full image URL and dimensions if we only have thumbnail
            if (baseItem.thumbnailUrl && !baseItem.imageUrl && baseItem.actressId) {
              try {
                const res = await fetch(`/api/actresses/${baseItem.actressId}`);
                if (res.ok) {
                  const actressData = await res.json();
                  const image = actressData.images?.gallery?.find((img: any) => 
                    img.id.toString() === baseItem.imageId
                  );
                  const hqImage = actressData.images?.hq?.find((hq: any) => 
                    hq.id === parseInt(baseItem.imageId) - 1 || hq.id === parseInt(baseItem.imageId) + 1
                  );
                  
                  if (image) {
                    baseItem.imageUrl = image.url || baseItem.thumbnailUrl;
                    baseItem.thumbnailUrl = image.thumbnailUrl || image.url || baseItem.thumbnailUrl;
                  }
                  
                  // Get dimensions and file size from HQ image
                  if (hqImage) {
                    baseItem.width = hqImage.width;
                    baseItem.height = hqImage.height;
                    // File size would need to be fetched separately or from database
                  }
                }
              } catch (e) {
                console.error('Error fetching image data:', e);
                // Use thumbnail as fallback
                baseItem.imageUrl = baseItem.thumbnailUrl;
              }
            } else if (!baseItem.imageUrl) {
              // If no imageUrl, use thumbnail
              baseItem.imageUrl = baseItem.thumbnailUrl;
            }
            
            // Preserve existing dimensions if available
            if (item.width) baseItem.width = item.width;
            if (item.height) baseItem.height = item.height;
            if (item.fileSizeMB) baseItem.fileSizeMB = item.fileSizeMB;
            
            return baseItem;
          })
        );
        
        console.log('Converted cart data:', cartData);
        setCart(cartData);
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to ensure cart context is available
    const timer = setTimeout(() => {
      loadCart();
    }, 100);

    return () => clearTimeout(timer);
  }, [cartContextItems]);

  // Calculate discount based on item count
  const calculateDiscount = (count: number): number => {
    if (count >= 10) return 0.20; // 20% discount for 10+ images
    if (count >= 5) return 0.10; // 10% discount for 5+ images
    return 0; // No discount
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const discountRate = calculateDiscount(cart.length);
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;
  const itemCount = cart.length;

  const handleProceedToPayment = () => {
    // Save cart to localStorage for payment page
    localStorage.setItem('hq_cart', JSON.stringify(cart));
    router.push('/checkout/payment');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h1
              className="text-[var(--text-primary)] mb-4"
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 'var(--h1-size)',
                lineHeight: 'var(--h1-line-height)',
                letterSpacing: 'var(--h1-letter-spacing)',
              }}
            >
              Your Cart is Empty
            </h1>
            <p className="text-[var(--text-secondary)] mb-6" style={{ fontFamily: 'var(--font-ui)' }}>Add some HQ images to your cart to continue.</p>
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
            >
              Browse Gallery
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />
      <main className="flex-1 py-10 md:py-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-[var(--text-primary)] mb-2"
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 'var(--h1-size)',
                lineHeight: 'var(--h1-line-height)',
                letterSpacing: 'var(--h1-letter-spacing)',
              }}
            >
              Checkout
            </h1>
            <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>Review your order before proceeding to payment</p>
          </div>

          {/* Cart Items */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-6 md:p-8 mb-6">
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={index} className="flex items-center gap-4 pb-4 border-b border-[var(--border-subtle)] last:border-0">
                  <img 
                    src={item.thumbnailUrl}
                    alt={item.actressName}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p
                      className="font-bold text-[var(--text-primary)] truncate uppercase"
                      style={{ fontFamily: "'Kabel Black', 'Arial Black', 'Arial Bold', Arial, sans-serif", fontSize: '22px', lineHeight: '1.2', fontWeight: '900' }}
                    >
                      {item.actressName}
                    </p>
                    {(item.width || item.height || item.fileSizeMB) && (
                      <p className="text-xs text-[var(--text-muted)] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {item.width && item.height && `${item.width} × ${item.height} px`}
                        {item.width && item.height && item.fileSizeMB && (
                          <span className="text-[var(--text-muted)]/80"> / {item.fileSizeMB} MB</span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`${item.fileSizeMB !== undefined && item.fileSizeMB !== null ? 'text-base font-bold text-[var(--text-primary)]' : 'text-sm font-semibold text-[var(--text-primary)]'}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>${item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="mt-6 pt-4 border-t-2 border-[var(--border-strong)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span className="text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>${subtotal.toFixed(2)}</span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700 font-medium" style={{ fontFamily: 'var(--font-ui)' }}>
                    Discount ({Math.round(discountRate * 100)}% off)
                  </span>
                  <span className="text-sm text-green-700 font-medium" style={{ fontFamily: 'var(--font-ui)' }}>
                    -${discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-lg font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>Total</span>
                <span className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Link 
              href="/search"
              className="px-6 py-3 border-2 border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-primary)]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Continue Shopping
            </Link>
            <button
              onClick={handleProceedToPayment}
              className="px-8 py-3 rounded-lg font-medium tracking-wide uppercase text-[var(--text-primary)] transition-all duration-300 relative overflow-hidden group"
              style={{
                backgroundColor: '#f6e5c0',
                border: '1px solid #6f5718',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                fontFamily: 'DM Sans, sans-serif',
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
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
