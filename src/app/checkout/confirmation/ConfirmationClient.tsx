'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/newdesign';
import '../../newdesign/design-tokens.css';

interface OrderData {
  orderId: string;
  email: string;
  downloadCode: string;
  downloadLink: string;
  items: Array<{
    imageId: string;
    actressId: string;
    actressName: string;
    hqUrl: string;
    imageUrl: string;
    width?: number;
    height?: number;
    fileSizeMB?: number;
  }>;
  total: number;
}

export default function ConfirmationClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (orderId) {
      console.log('Fetching order data for:', orderId);

      // First try to get from localStorage (backup)
      const savedOrder = localStorage.getItem(`order_${orderId}`);
      if (savedOrder) {
        try {
          const order = JSON.parse(savedOrder);
          console.log('Found order in localStorage:', order);
          setOrderData(order);
          // Also save download order data
          if (order.downloadCode) {
            localStorage.setItem(
              `download_order_${order.downloadCode}`,
              JSON.stringify({
                orderId: order.orderId,
                email: order.email,
                items: order.items,
                code: order.downloadCode,
                used: false,
              })
            );
          }
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing saved order:', e);
        }
      }

      // Fetch order data from API
      fetch(`/api/checkout/order/${orderId}`)
        .then((res) => {
          console.log('Order fetch response status:', res.status);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log('Order fetch response data:', data);
          if (data.success && data.order) {
            setOrderData(data.order);
            // Save to localStorage as backup
            localStorage.setItem(`order_${orderId}`, JSON.stringify(data.order));
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
                  thumbnailUrl: item.thumbnailUrl || item.imageUrl || '',
                  width: item.width,
                  height: item.height,
                  fileSizeMB: item.fileSizeMB,
                })),
                code: data.order.downloadCode,
                used: false,
              };
              localStorage.setItem(
                `download_order_${data.order.downloadCode}`,
                JSON.stringify(downloadData)
              );
              // Also save with uppercase code for case-insensitive lookup
              localStorage.setItem(
                `download_order_${data.order.downloadCode.toUpperCase()}`,
                JSON.stringify(downloadData)
              );
            }
          } else {
            console.error('Order fetch failed:', data.error);
            // Try debug endpoint
            fetch('/api/checkout/debug')
              .then((debugRes) => debugRes.json())
              .then((debugData) => {
                console.log('Debug info:', debugData);
              });
          }
        })
        .catch((err) => {
          console.error('Error fetching order:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      console.log('No orderId provided');
      setLoading(false);
    }
  }, [orderId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div
            className="text-center text-[var(--text-secondary)]"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Loading...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h1
              className="text-[var(--text-primary)] mb-4 uppercase"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                fontSize: 'clamp(15px, calc(15px + 0.268vw), 18px)',
                letterSpacing: '0.14em',
                lineHeight: 1.25,
              }}
            >
              Order Not Found
            </h1>
            <p
              className="text-[var(--text-secondary)] mb-6"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              We couldn't find your order. Please contact support if you believe
              this is an error.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-medium tracking-wide uppercase text-[var(--text-primary)] transition-all duration-300 relative overflow-hidden group"
              style={{
                backgroundColor: '#f6e5c0',
                border: '1px solid #6f5718',
                boxShadow:
                  '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow =
                  '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.backgroundColor = '#fff5e1';
                e.currentTarget.style.borderColor = '#8b6f2a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow =
                  '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
                e.currentTarget.style.backgroundColor = '#f6e5c0';
                e.currentTarget.style.borderColor = '#6f5718';
              }}
            >
              Return to Gallery
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const fullDownloadLink = `${typeof window !== 'undefined' ? window.location.origin : ''}${orderData.downloadLink}`;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />
      <main className="flex-1 py-10 md:py-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
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
              Payment Successful!
            </h1>
            <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>
              Thank you for your purchase
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-6 md:p-8 mb-6">
            <div className="space-y-2 pt-2" style={{ fontFamily: 'var(--font-ui)' }}>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-primary)]" style={{ fontSize: '16px', lineHeight: '1.7', fontWeight: 'semibold' }}>Total</span>
                <span className="text-[var(--text-primary)]" style={{ fontSize: '24px', lineHeight: '1.3', fontWeight: 'bold' }}>${orderData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Download Instructions */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-[var(--shadow-subtle)] p-6 md:p-8 mb-6">
            <h2
              className="text-[var(--text-primary)] mb-4 flex items-center gap-2 uppercase"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 500,
                fontSize: 'clamp(15px, calc(15px + 0.268vw), 18px)',
                letterSpacing: '0.14em',
                lineHeight: 1.25,
              }}
            >
              <span>📥</span>
              Download Your Images
            </h2>

            <div className="space-y-4">
              <p className="text-gray-700" style={{ fontFamily: 'var(--font-ui)' }}>
                Your download link and code have been sent to <strong>{orderData.email}</strong>.
                You can also use them below:
              </p>

              {/* Download Code */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                  Your Download Code:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orderData.downloadCode}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[var(--bg-page)] border-2 border-[var(--border-subtle)] rounded-lg font-mono text-lg font-bold text-center text-[var(--text-primary)]"
                    style={{ fontFamily: 'var(--font-ui)' }}
                  />
                  <button
                    onClick={() => copyToClipboard(orderData.downloadCode)}
                    className="px-4 py-3 bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors text-[var(--text-primary)]"
                    title="Copy code"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              {/* Download Link */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                  Your Download Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={fullDownloadLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[var(--bg-page)] border-2 border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)]"
                    style={{ fontFamily: 'var(--font-ui)' }}
                  />
                  <button
                    onClick={() => copyToClipboard(fullDownloadLink)}
                    className="px-4 py-3 bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-surface)] rounded-lg transition-colors text-[var(--text-primary)]"
                    title="Copy link"
                  >
                    {copied ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              {/* Download Button */}
              <div className="pt-4">
                <Link
                  href={orderData.downloadLink}
                  className="block w-full px-6 py-4 rounded-lg font-medium text-center tracking-wide uppercase transition-all duration-300 relative overflow-hidden group"
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
                  Go to Download Page →
                </Link>
              </div>
            </div>

            {/* Important Notice */}
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800" style={{ fontFamily: 'var(--font-ui)' }}>
                <strong>⚠️ Important:</strong> This download link and code are valid for{' '}
                <strong>one-time use only</strong>. Make sure to download all your images before
                closing the download page.
              </p>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <Link
              href="/search"
              className="flex-1 px-6 py-3 border-2 border-[var(--border-subtle)] rounded-lg text-center hover:bg-[var(--bg-surface)] transition-colors text-[var(--text-primary)]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              Browse More Images
            </Link>
            <Link
              href={orderData.downloadLink}
              className="flex-1 px-6 py-3 rounded-lg text-center font-medium tracking-wide uppercase transition-all duration-300 relative overflow-hidden group"
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
              Download Now
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


