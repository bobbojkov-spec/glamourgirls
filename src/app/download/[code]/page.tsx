'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/newdesign';
import '../../newdesign/design-tokens.css';

interface DownloadData {
  orderId: string;
  email: string;
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
  code: string;
  used: boolean;
}

export default function DownloadPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [downloadData, setDownloadData] = useState<DownloadData | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadedItems, setDownloadedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // If code is in URL, try to verify it
    if (code && code !== 'code') {
      const upperCode = code.trim().toUpperCase();
      setEnteredCode(upperCode);
      verifyCode(upperCode);
    } else {
      setLoading(false);
    }
  }, [code]);

  const verifyCode = async (codeToVerify: string) => {
    setVerifying(true);
    setError('');

    const upperCode = codeToVerify.trim().toUpperCase();
    console.log('Verifying code:', upperCode);

    // First check localStorage as fallback (try both exact and uppercase)
    let savedOrder = localStorage.getItem(`download_order_${upperCode}`);
    if (!savedOrder) {
      savedOrder = localStorage.getItem(`download_order_${codeToVerify.trim()}`);
    }
    
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        console.log('Found order in localStorage:', order);
        const isUsed = order.used || false;
        setDownloadData({
          orderId: order.orderId,
          email: order.email,
          items: order.items || [],
          code: order.code || upperCode,
          used: isUsed,
        });
        // If code is used, show error message
        if (isUsed) {
          setError('⚠️ This download code has already been used and is no longer active.');
        }
        setVerifying(false);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Error parsing saved order:', e);
      }
    }

    try {
      const response = await fetch(`/api/download/verify?code=${encodeURIComponent(upperCode)}`);
      const data = await response.json();
      console.log('Verification response:', data);

      if (data.success && data.download) {
        setDownloadData(data.download);
        // Save to localStorage as backup (save with both exact and uppercase keys)
        localStorage.setItem(`download_order_${upperCode}`, JSON.stringify(data.download));
        localStorage.setItem(`download_order_${codeToVerify.trim()}`, JSON.stringify(data.download));
        // If code is used, set error but still show the data (so user can see what was purchased)
        if (data.download.used) {
          setError('⚠️ This download code has already been used and is no longer active.');
        }
      } else {
        console.error('Verification failed:', data.error, data.debug);
        setError(data.error || 'Invalid download code. Please check and try again.');
        setDownloadData(null);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred. Please try again.');
      setDownloadData(null);
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim()) {
      verifyCode(enteredCode.trim().toUpperCase());
    }
  };

  const downloadImage = async (item: DownloadData['items'][0]) => {
    if (downloadedItems.has(item.imageId)) {
      return; // Already downloaded
    }

    setDownloading(true);
    try {
      const downloadCode = (code && code !== 'code' ? code : enteredCode)?.trim().toUpperCase();
      console.log('Downloading image:', item.imageId, 'with code:', downloadCode, 'hqUrl:', item.hqUrl);

      // Try download API endpoint with code first
      let downloadUrl = `/api/download/image?imageId=${encodeURIComponent(item.imageId)}`;
      
      if (downloadCode) {
        downloadUrl += `&code=${encodeURIComponent(downloadCode)}`;
      }
      
      // ALWAYS include hqUrl - this is required for HQ downloads
      if (!item.hqUrl) {
        throw new Error('HQ image URL not available. Please contact support.');
      }
      downloadUrl += `&hqUrl=${encodeURIComponent(item.hqUrl)}`;
      
      let response = await fetch(downloadUrl);
      
      // If API fails, check if it's because code is already used
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        
        // If code is already used, don't allow fallback downloads
        if (errorData.error && errorData.error.includes('already been used')) {
          throw new Error(errorData.error);
        }
        
        // For other errors, if we have hqUrl and code, try with just hqUrl (but only if code not used)
        if (item.hqUrl && downloadCode && downloadData && !downloadData.used) {
          console.warn('API download failed:', errorData.error, 'Trying with hqUrl only');
          
          // Retry with just hqUrl (client-side verified)
          downloadUrl = `/api/download/image?imageId=${encodeURIComponent(item.imageId)}&hqUrl=${encodeURIComponent(item.hqUrl)}&code=${encodeURIComponent(downloadCode)}`;
          response = await fetch(downloadUrl);
          
          // If still fails with "already used", throw that error
          if (!response.ok) {
            const retryErrorData = await response.json().catch(() => ({ error: 'Download failed' }));
            if (retryErrorData.error && retryErrorData.error.includes('already been used')) {
              throw new Error(retryErrorData.error);
            }
          }
        } else {
          throw new Error(errorData.error || 'Failed to download image. Please try again or contact support.');
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(errorData.error || 'Failed to download image. Please try again or contact support.');
      }

      // Get the file as a blob
      const blob = await response.blob();
      
      // Create a temporary link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      const fileExt = item.hqUrl?.match(/\.(jpg|jpeg|png|gif)$/i)?.[0] || '.jpg';
      let filename = `${item.actressName.replace(/\s+/g, '_')}_HQ_${item.imageId}${fileExt}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(url);

      // Mark as downloaded
      setDownloadedItems(prev => new Set([...prev, item.imageId]));

      // Refresh order status from API to check if code is now used (after all images downloaded)
      if (downloadCode) {
        try {
          const verifyResponse = await fetch(`/api/download/verify?code=${encodeURIComponent(downloadCode)}`);
          const verifyData = await verifyResponse.json();
          if (verifyData.success && verifyData.download) {
            // Update downloadData with fresh status from API
            setDownloadData(verifyData.download);
            // Update localStorage
            localStorage.setItem(`download_order_${downloadCode}`, JSON.stringify(verifyData.download));
            // If code is now used, show error message
            if (verifyData.download.used) {
              setError('⚠️ All images have been downloaded. This download code is now expired.');
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing order status:', refreshError);
          // Don't fail the download if refresh fails
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download image. Please try again.';
      alert(`Download failed: ${errorMessage}\n\nIf this persists, please contact support with your download code.`);
    } finally {
      setDownloading(false);
    }
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

  // Code entry form
  if (!downloadData) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
        <Header />
        <main className="flex-1 py-10 md:py-16 px-4 md:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-8">
              <h1
                className="text-[var(--text-primary)] text-center mb-2 uppercase"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: 'clamp(15px, calc(15px + 0.268vw), 18px)',
                  letterSpacing: '0.14em',
                  lineHeight: 1.25,
                }}
              >
                Download Your Images
              </h1>
              <p className="text-[var(--text-secondary)] text-center mb-6" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: '1.4' }}>
                Enter your download code to access your purchased HQ images
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium mb-2 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                    Download Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                    placeholder="Enter your code"
                    className="w-full px-4 py-3 border-2 border-[var(--border-subtle)] rounded-lg font-mono text-lg text-center bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--state-focus-ring)]"
                    style={{ fontFamily: 'var(--font-ui)' }}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600" style={{ fontFamily: 'var(--font-ui)' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifying || !enteredCode.trim()}
                  className="w-full px-6 py-3 rounded-lg text-sm font-medium tracking-wide uppercase transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: verifying || !enteredCode.trim() ? '#d4c5a9' : '#f6e5c0',
                    border: '1px solid #6f5718',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
                    fontFamily: 'DM Sans, sans-serif',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!verifying && enteredCode.trim()) {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.backgroundColor = '#fff5e1';
                      e.currentTarget.style.borderColor = '#8b6f2a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!verifying && enteredCode.trim()) {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
                      e.currentTarget.style.backgroundColor = '#f6e5c0';
                      e.currentTarget.style.borderColor = '#6f5718';
                    }
                  }}
                >
                  {verifying ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-muted)] text-center" style={{ fontFamily: 'var(--font-ui)' }}>
                  Your download code was sent to your email after purchase.
                  <br />
                  If you've lost it, please contact support.
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Download page
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />
      <main className="flex-1 py-10 md:py-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-6 md:p-8 mb-6">
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
              Your HQ Images
            </h1>
            <p className="text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: '1.4' }}>
              Order: {downloadData.orderId} • {downloadData.items.length} {downloadData.items.length === 1 ? 'image' : 'images'}
            </p>
            {downloadData.used && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800" style={{ fontFamily: 'var(--font-ui)' }}>
                  ⚠️ This download code has been used. You can still download images below.
                </p>
            </div>
          )}
        </div>


          {/* Image Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {downloadData.items.map((item) => {
              const isDownloaded = downloadedItems.has(item.imageId);
              
              // Use the actual thumbnail URL from the database (same as gallery page)
              // This is the pre-generated thumbnail file (mytp = 3), not a dynamically generated one
              const thumbnailUrl = (item as any).thumbnailUrl || item.imageUrl || item.hqUrl || '';
              
              return (
                <div key={item.imageId} className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] overflow-hidden">
                  {/* Thumbnail container - fixed 200px height like gallery */}
                  <div 
                    className="gallery-thumb relative bg-[var(--bg-page)]"
                    style={{ height: '200px' }}
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={item.actressName}
                        className="h-full w-auto object-contain"
                        style={{ height: '200px', width: 'auto', maxWidth: '100%' }}
                        loading="lazy"
                        onError={(e) => {
                          // Fallback if thumbnail fails - try direct gallery image
                          const img = e.target as HTMLImageElement;
                          if (item.imageUrl && !item.imageUrl.includes('/api/')) {
                            img.src = item.imageUrl;
                          } else if (item.hqUrl) {
                            img.src = item.hqUrl;
                          } else {
                            img.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                        <span className="text-xs" style={{ fontFamily: 'var(--font-ui)' }}>No preview</span>
                      </div>
                    )}
                    {isDownloaded && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-75 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="text-2xl mb-1">✓</div>
                          <div className="font-semibold text-xs" style={{ fontFamily: 'var(--font-ui)' }}>Downloaded</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p
                      className="mb-1 truncate block text-[var(--text-primary)]"
                      style={{ 
                        fontFamily: "'Playfair Display', 'Didot', 'Times New Roman', serif",
                        fontSize: 'clamp(16px, 0.4vw + 16px, 18px)',
                        fontWeight: 500,
                        letterSpacing: '0.01em',
                        lineHeight: '1.2',
                      }}
                      title={item.actressName}
                    >
                      {item.actressName}
                    </p>
                    {(item.width || item.height || item.fileSizeMB) && (
                      <p className="text-[var(--text-muted)] mb-2" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', lineHeight: '1.4' }}>
                        {item.width && item.height && `${item.width} × ${item.height} px`}
                        {item.width && item.height && item.fileSizeMB && (
                          <span className="text-[var(--text-muted)]/80"> / {item.fileSizeMB} MB</span>
                        )}
                      </p>
                    )}
                    {downloadData.used ? (
                      <div className="w-full px-3 py-2 bg-[var(--bg-surface-alt)] text-[var(--text-muted)] rounded-lg text-xs font-medium text-center" style={{ fontFamily: 'var(--font-ui)' }}>
                        Code Expired
                      </div>
                    ) : (
                      <button
                        onClick={() => downloadImage(item)}
                        disabled={downloading || isDownloaded}
                        className="w-full px-3 py-2 rounded-lg text-xs font-medium tracking-wide uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: downloading || isDownloaded ? '#d4c5a9' : '#f6e5c0',
                          border: '1px solid #6f5718',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                          fontFamily: 'DM Sans, sans-serif',
                          color: 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => {
                          if (!downloading && !isDownloaded) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                            e.currentTarget.style.backgroundColor = '#fff5e1';
                            e.currentTarget.style.borderColor = '#8b6f2a';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!downloading && !isDownloaded) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.backgroundColor = '#f6e5c0';
                            e.currentTarget.style.borderColor = '#6f5718';
                          }
                        }}
                      >
                        {isDownloaded ? '✓ Downloaded' : 'Download HQ'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <Link
              href="/search"
              className="text-sm text-[var(--accent-gold)] hover:underline"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              ← Return to Gallery
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

