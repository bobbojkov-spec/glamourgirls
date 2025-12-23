'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { Header, Footer } from '@/components/newdesign';
import '../../newdesign/design-tokens.css';

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

export default function PaymentPage() {
  const router = useRouter();
  const { clearCart } = useCart();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple' | 'google' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; paymentMethod?: string }>({});

  useEffect(() => {
    // Get cart from localStorage
    const savedCart = localStorage.getItem('hq_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing cart:', e);
        router.push('/checkout');
      }
    } else {
      router.push('/checkout');
    }
  }, [router]);

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

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!validateEmail(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    if (!paymentMethod) {
      setErrors({ paymentMethod: 'Please select a payment method' });
      return;
    }

    setProcessing(true);

    try {
      // Create payment session (demo mode - no actual Stripe call)
      const response = await fetch('/api/checkout/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          paymentMethod,
          items: cart,
          total,
        }),
      });

      const data = await response.json();
      console.log('Payment response:', data);

      if (response.ok && data.success) {
        console.log('Payment successful, orderId:', data.orderId);
        
        // Clear cart from all sources
        clearCart(); // Clear CartContext
        localStorage.removeItem('hq_cart');
        localStorage.removeItem('hq_cart_items');
        setCart([]); // Clear local state
        
        // Store order data in localStorage as backup
        if (data.order) {
          localStorage.setItem(`order_${data.orderId}`, JSON.stringify(data.order));
          
          // Also save download order data for download page
          if (data.order.downloadCode) {
            const downloadData = {
              orderId: data.order.orderId,
              email: data.order.email,
              items: data.order.items.map((item: any) => ({
                imageId: item.imageId,
                actressId: item.actressId,
                actressName: item.actressName,
                hqUrl: item.hqUrl,
                imageUrl: item.imageUrl,
                width: item.width,
                height: item.height,
                fileSizeMB: item.fileSizeMB,
              })),
              code: data.order.downloadCode,
              used: false,
            };
            localStorage.setItem(`download_order_${data.order.downloadCode}`, JSON.stringify(downloadData));
            localStorage.setItem(`download_order_${data.order.downloadCode.toUpperCase()}`, JSON.stringify(downloadData));
          }
        }
        
        // Redirect to confirmation page with order ID
        router.push(`/checkout/confirmation?orderId=${data.orderId}`);
      } else {
        console.error('Payment failed:', data);
        setErrors({ paymentMethod: data.error || 'Payment processing failed. Please try again.' });
        setProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setErrors({ paymentMethod: 'An error occurred. Please try again.' });
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />
      <main className="flex-1 py-10 md:py-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
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
              Payment
            </h1>
            <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>Enter your email and select a payment method</p>
          </div>

          {/* Order Summary */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-6 md:p-8 mb-6">
            <h2
              className="text-[var(--text-primary)] mb-4"
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 'var(--h2-size)',
                lineHeight: 'var(--h2-line-height)',
                letterSpacing: 'var(--h2-letter-spacing)',
              }}
            >
              Order Summary
            </h2>
          
            {/* Item List */}
            {cart.length > 0 && (
              <div className="mb-4 space-y-3 max-h-64 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-[var(--border-subtle)] last:border-0">
                    <img 
                      src={item.thumbnailUrl || item.imageUrl} 
                      alt={item.actressName}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-sm truncate block text-[var(--text-primary)]"
                        style={{ fontFamily: "'Kabel Black', sans-serif" }}
                      >
                        {item.actressName}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>HQ Image #{item.imageId}</p>
                      {(item.width || item.height || item.fileSizeMB) && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5" style={{ fontFamily: 'var(--font-ui)' }}>
                          {item.width && item.height && `${item.width} × ${item.height} px`}
                          {item.width && item.height && item.fileSizeMB && ' • '}
                          {item.fileSizeMB && `${item.fileSizeMB} MB`}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="space-y-2 text-sm pt-2 border-t border-[var(--border-subtle)]" style={{ fontFamily: 'var(--font-ui)' }}>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discount ({Math.round(discountRate * 100)}% off)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--accent-gold)]">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-6 md:p-8">
            {/* Email Input */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 ${
                  errors.email ? 'border-red-500' : 'border-[var(--border-subtle)] focus:ring-[var(--state-focus-ring)]'
                }`}
                style={{ fontFamily: 'var(--font-ui)' }}
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500" style={{ fontFamily: 'var(--font-ui)' }}>{errors.email}</p>
              )}
              <p className="mt-1 text-xs text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-ui)' }}>
                We'll send your download link and code to this email
              </p>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {/* Credit Card */}
                <label className="flex items-center p-4 border-2 border-[var(--border-subtle)] rounded-lg cursor-pointer hover:bg-[var(--bg-surface-alt)] transition-colors bg-[var(--bg-page)]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="mr-3 accent-[var(--accent-gold)]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>Credit or Debit Card</div>
                    <div className="text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>Visa, Mastercard, American Express</div>
                  </div>
                  <div className="text-2xl">💳</div>
                </label>

                {/* Apple Pay */}
                <label className="flex items-center p-4 border-2 border-[var(--border-subtle)] rounded-lg cursor-pointer hover:bg-[var(--bg-surface-alt)] transition-colors bg-[var(--bg-page)]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="apple"
                    checked={paymentMethod === 'apple'}
                    onChange={() => setPaymentMethod('apple')}
                    className="mr-3 accent-[var(--accent-gold)]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>Apple Pay</div>
                    <div className="text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>Pay securely with Apple Pay</div>
                  </div>
                  <div className="text-2xl">🍎</div>
                </label>

                {/* Google Pay */}
                <label className="flex items-center p-4 border-2 border-[var(--border-subtle)] rounded-lg cursor-pointer hover:bg-[var(--bg-surface-alt)] transition-colors bg-[var(--bg-page)]">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="google"
                    checked={paymentMethod === 'google'}
                    onChange={() => setPaymentMethod('google')}
                    className="mr-3 accent-[var(--accent-gold)]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>Google Pay</div>
                    <div className="text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>Pay securely with Google Pay</div>
                  </div>
                  <div className="text-2xl">📱</div>
                </label>
              </div>
              {errors.paymentMethod && (
                <p className="mt-2 text-sm text-red-500" style={{ fontFamily: 'var(--font-ui)' }}>{errors.paymentMethod}</p>
              )}
            </div>

            {/* Security Notice */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800" style={{ fontFamily: 'var(--font-ui)' }}>
                <strong>🔒 Secure Payment:</strong> This is a demo checkout. No actual payment will be processed.
                Your payment information is handled securely through Stripe.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Link
                href="/checkout"
                className="flex-1 px-6 py-3 border-2 border-[var(--border-subtle)] rounded-lg text-center hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-primary)]"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={processing}
                className="flex-1 px-6 py-3 rounded-lg font-medium tracking-wide uppercase text-[var(--text-primary)] transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: processing ? '#d4c5a9' : '#f6e5c0',
                  border: '1px solid #6f5718',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                  fontFamily: 'DM Sans, sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (!processing) {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.backgroundColor = '#fff5e1';
                    e.currentTarget.style.borderColor = '#8b6f2a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!processing) {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
                    e.currentTarget.style.backgroundColor = '#f6e5c0';
                    e.currentTarget.style.borderColor = '#6f5718';
                  }
                }}
              >
                {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

