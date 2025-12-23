'use client';

import { useState } from 'react';
import { Header, Footer } from '@/components/newdesign';
import '../newdesign/design-tokens.css';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const messageMaxLength = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaVerified) {
      alert('Please complete the CAPTCHA verification');
      return;
    }

    setIsSubmitting(true);
    
    // Mock API call - in production this would send to backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setIsSubmitting(false);
  };

  // Mock CAPTCHA verification - replace with real reCAPTCHA/hCaptcha
  const handleCaptchaVerify = () => {
    setCaptchaVerified(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
        <Header />
        <main className="flex-1 py-10 md:py-16 px-4 md:px-6 lg:px-8">
          <div className="max-w-[600px] mx-auto">
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-8 text-center">
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
                className="text-[var(--text-primary)] mb-4"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: 'var(--h2-size)',
                  lineHeight: 'var(--h2-line-height)',
                  letterSpacing: 'var(--h2-letter-spacing)',
                }}
              >
                Message Sent!
              </h2>
              <p className="text-[var(--text-secondary)] mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
                Thank you for contacting us. We&apos;ll get back to you as soon as possible.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', email: '', message: '' });
                  setCaptchaVerified(false);
                }}
                className="text-[var(--accent-gold)] hover:text-[var(--text-primary)] transition-colors"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Send another message
              </button>
            </div>
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
        <div className="max-w-[600px] mx-auto">
          <h1
            className="text-[var(--text-primary)] mb-8"
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: 'var(--h1-size)',
              lineHeight: 'var(--h1-line-height)',
              letterSpacing: 'var(--h1-letter-spacing)',
            }}
          >
            Contact Us
          </h1>

          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-6 md:p-8">
            <p className="text-[var(--text-secondary)] mb-6" style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--body-size)' }}>
              If you have additional information about any of our actresses, corrections, 
              or just want to say hello, please use the form below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--state-focus-ring)]"
                  style={{ fontFamily: 'var(--font-ui)' }}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--state-focus-ring)]"
                  style={{ fontFamily: 'var(--font-ui)' }}
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => {
                    if (e.target.value.length <= messageMaxLength) {
                      setFormData(prev => ({ ...prev, message: e.target.value }));
                    }
                  }}
                  rows={6}
                  className="w-full border border-[var(--border-subtle)] bg-[var(--bg-page)] text-[var(--text-primary)] px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--state-focus-ring)] resize-vertical"
                  style={{ fontFamily: 'var(--font-ui)' }}
                  required
                />
                <p className="text-xs text-[var(--text-muted)] mt-1 text-right" style={{ fontFamily: 'var(--font-ui)' }}>
                  {formData.message.length}/{messageMaxLength} characters
                </p>
              </div>

              {/* CAPTCHA Placeholder */}
              <div className="border border-[var(--border-subtle)] p-4 bg-[var(--bg-surface-alt)] rounded-lg">
                <p className="text-sm text-[var(--text-secondary)] mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
                  Please verify you&apos;re human:
                </p>
                
                {/* This is a placeholder - replace with actual reCAPTCHA/hCaptcha */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={captchaVerified}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleCaptchaVerify();
                        } else {
                          setCaptchaVerified(false);
                        }
                      }}
                      className="w-5 h-5 accent-[var(--accent-gold)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-ui)' }}>I&apos;m not a robot</span>
                  </label>
                  {captchaVerified && (
                    <span className="text-green-600 text-sm" style={{ fontFamily: 'var(--font-ui)' }}>✓ Verified</span>
                  )}
                </div>
                
                <p className="text-xs text-[var(--text-muted)] mt-2" style={{ fontFamily: 'var(--font-ui)' }}>
                  {/* In production, this would show actual reCAPTCHA widget */}
                  CAPTCHA placeholder - will integrate Google reCAPTCHA or hCaptcha
                </p>
              </div>

              <div className="text-center pt-4">
                <button 
                  type="submit" 
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
                  disabled={isSubmitting || !captchaVerified}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
