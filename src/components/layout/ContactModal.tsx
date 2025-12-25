'use client';

import { useState, useRef, useEffect } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Cloudflare Turnstile widget ID
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  // Load Turnstile script
  useEffect(() => {
    if (!isOpen || !TURNSTILE_SITE_KEY) return;

    // Load Turnstile script if not already loaded
    if (!document.getElementById('turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        // Render Turnstile widget after script loads
        if (turnstileRef.current && (window as any).turnstile) {
          const widgetId = (window as any).turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'light',
            size: 'normal',
          });
          turnstileWidgetId.current = widgetId;
        }
      };
    } else if (turnstileRef.current && (window as any).turnstile && !turnstileWidgetId.current) {
      // Script already loaded, render widget
      const widgetId = (window as any).turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        size: 'normal',
      });
      turnstileWidgetId.current = widgetId;
    }

    return () => {
      // Reset widget when modal closes
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Get Turnstile token if available
      let turnstileToken = '';
      if (TURNSTILE_SITE_KEY && turnstileWidgetId.current && (window as any).turnstile) {
        try {
          turnstileToken = (window as any).turnstile.getResponse(turnstileWidgetId.current);
        } catch (err) {
          console.warn('Could not get Turnstile token:', err);
        }
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
      
      // Reset Turnstile widget
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetId.current);
      }
      
      // Don't auto-close - let user click "Send another message" or close button
    } catch (error: any) {
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
      
      // Reset Turnstile widget on error
      if (turnstileWidgetId.current && (window as any).turnstile) {
        (window as any).turnstile.reset(turnstileWidgetId.current);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)] p-6 max-w-md w-full max-h-[80vh] flex flex-col pointer-events-auto overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-[var(--border-subtle)] pb-5 px-0">
            <h2
              className="text-[var(--text-primary)]"
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 'var(--h2-size)',
                letterSpacing: 'var(--h2-letter-spacing)',
                lineHeight: 'var(--h2-line-height)',
              }}
            >
              Contact Us
            </h2>
            <button
              onClick={onClose}
              className="interactive-icon text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Close contact form"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            {submitStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent-gold)] flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2
                  className="text-[var(--text-primary)]"
                  style={{
                    fontFamily: 'var(--font-headline)',
                    fontSize: 'var(--h2-size)',
                    lineHeight: 'var(--h2-line-height)',
                    letterSpacing: 'var(--h2-letter-spacing)',
                    marginBottom: '30px',
                  }}
                >
                  MESSAGE SENT!
                </h2>
                <p className="text-[var(--text-secondary)] mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
                  Thank you for contacting us. We&apos;ll get back to you as soon as possible.
                </p>
                <button
                  onClick={() => {
                    setSubmitStatus('idle');
                    setFormData({ name: '', email: '', message: '' });
                    setErrorMessage('');
                    // Reset Turnstile widget
                    if (turnstileWidgetId.current && (window as any).turnstile) {
                      (window as any).turnstile.reset(turnstileWidgetId.current);
                    }
                  }}
                  className="text-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors"
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[var(--text-primary)] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[var(--text-primary)] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] bg-[var(--bg-surface)] text-[var(--text-primary)] resize-none"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                    placeholder="Your message..."
                  />
                </div>

                {/* Turnstile CAPTCHA */}
                {TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center">
                    <div ref={turnstileRef} id="turnstile-widget"></div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      {errorMessage || 'Something went wrong. Please try again.'}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="interactive-button flex-1 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-surface)]"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="interactive-button flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[var(--accent-gold)] rounded-lg hover:bg-[var(--accent-gold)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

