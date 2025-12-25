'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchModal from '@/components/layout/SearchModal';
import ContactModal from '@/components/layout/ContactModal';
import GalleriesModal from './GalleriesModal';
import FavoritesModal from './FavoritesModal';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useContactModal } from '@/context/ContactModalContext';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [galleriesModalOpen, setGalleriesModalOpen] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);
  const { toggleCart, itemCount } = useCart();
  const { toggleFavorites, favoriteCount } = useFavorites();
  const { isOpen: contactModalOpen, openModal: openContactModal, closeModal: closeContactModal } = useContactModal();

  useEffect(() => {
    // Check if font is loaded
    if (typeof document !== 'undefined') {
      const checkFont = async () => {
        try {
          await document.fonts.ready;
          const isLoaded = document.fonts.check('1em "Dubba Dubba NF"');
          if (isLoaded) {
            setFontLoaded(true);
          } else {
            // Fallback: show after a short delay if font check fails
            setTimeout(() => setFontLoaded(true), 100);
          }
        } catch {
          // Fallback: show after a short delay
          setTimeout(() => setFontLoaded(true), 100);
        }
      };
      checkFont();
    } else {
      setFontLoaded(true);
    }
  }, []);

  return (
    <>
      <header className="bg-[var(--bg-page)] border-b border-[var(--border-subtle)] sticky top-0 z-50 shadow-[0_2px_20px_rgba(0,0,0,0.06)]" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
        <div className="flex items-center justify-between h-16 md:h-20 flex-wrap" style={{ minWidth: 0, width: '100%', gap: '8px' }}>
          {/* Logo - Dubba Dubba NF wordmark */}
          <Link href="/" className="leading-none flex-shrink" style={{ minWidth: 0, maxWidth: '100%', flex: '1 1 auto' }}>
            <span
              className="tracking-[0.015em] text-[var(--text-primary)] uppercase"
              style={{ 
                fontFamily: 'var(--font-logo-hero)',
                // 20% bigger on mobile: 1.25rem * 1.2 = 1.5rem (24px)
                // Smooth scaling from 24px (320px viewport) to 38px (1440px+ viewport)
                // Formula: clamp(min, preferred, max) where preferred scales linearly
                fontSize: 'clamp(1.5rem, 1.5rem + 1.25vw, 2.375rem)',
                opacity: fontLoaded ? 1 : 0,
                transition: 'opacity 0.2s ease-in',
                whiteSpace: 'nowrap',
                display: 'block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                // Prevent font rendering jumps and layout shifts
                willChange: 'auto',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                textRendering: 'optimizeLegibility',
                // Ensure stable rendering during resize
                transform: 'translateZ(0)',
              }}
            >
              Glamour Girls
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm tracking-[0.08em] uppercase">
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="text-[var(--text-primary)] font-medium transition-all duration-200 relative px-2 py-1 rounded"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-gold)';
                e.currentTarget.style.textShadow = '0 2px 4px rgba(200, 164, 93, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              SEARCH
            </button>
            <button
              type="button"
              onClick={() => setGalleriesModalOpen(true)}
              className="interactive-link text-[var(--text-primary)] font-medium relative px-2 py-1 rounded"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={(e) => {
                if (window.innerWidth >= 768) {
                  e.currentTarget.style.color = 'var(--accent-gold)';
                  e.currentTarget.style.textShadow = '0 2px 4px rgba(200, 164, 93, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              GALLERIES
            </button>
            <Link
              href="/contact"
              className="interactive-link text-[var(--text-primary)] font-medium relative px-2 py-1 rounded"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={(e) => {
                if (window.innerWidth >= 768) {
                  e.currentTarget.style.color = 'var(--accent-gold)';
                  e.currentTarget.style.textShadow = '0 2px 4px rgba(200, 164, 93, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              CONTACT
            </Link>
          </nav>

          <div className="hidden md:flex items-center" style={{ gap: '15px' }}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorites();
              }}
              aria-label={`Favorites (${favoriteCount} items)`}
              className="interactive-icon relative flex items-center justify-center hover:text-[var(--accent-gold)]"
              style={{ 
                width: '45px', 
                height: '45px',
                minWidth: '45px',
                minHeight: '45px',
                pointerEvents: 'auto',
              }}
            >
              <svg 
                width="25" 
                height="25" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--text-primary)]"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--accent-gold)] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {favoriteCount}
                </span>
              )}
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCart();
              }}
              aria-label={`Shopping cart with ${itemCount} items`}
              className="relative flex items-center justify-center active:scale-95 active:opacity-80 transition-all duration-150 hover:text-[var(--accent-gold)] cursor-pointer"
              style={{ 
                width: '45px', 
                height: '45px',
                minWidth: '0',
                minHeight: '45px',
                pointerEvents: 'auto',
                flexShrink: 0,
              }}
            >
              <svg 
                width="25" 
                height="25" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                className="text-[var(--text-primary)]"
              >
                <path d="M6 6h15l-1.5 9h-12z" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
                <path d="M6 6L4 2H2" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--accent-gold)] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          <div className="md:hidden flex items-center flex-shrink-0" style={{ gap: '8px', minWidth: 0 }}>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorites();
              }}
              aria-label={`Favorites (${favoriteCount} items)`}
              className="relative flex items-center justify-center active:scale-95 active:opacity-80 transition-all duration-150 cursor-pointer"
              style={{ 
                width: '40px', 
                height: '40px',
                minWidth: '0',
                minHeight: '40px',
                pointerEvents: 'auto',
                flexShrink: 0,
              }}
            >
              <svg 
                width="25" 
                height="25" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--text-primary)]"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--accent-gold)] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {favoriteCount}
                </span>
              )}
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCart();
              }}
              aria-label={`Shopping cart with ${itemCount} items`}
              className="relative flex items-center justify-center active:scale-95 active:opacity-80 transition-all duration-150 cursor-pointer"
              style={{ 
                width: '40px', 
                height: '40px',
                minWidth: '0',
                minHeight: '40px',
                pointerEvents: 'auto',
                flexShrink: 0,
              }}
            >
              <svg 
                width="25" 
                height="25" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5"
                className="text-[var(--text-primary)]"
              >
                <path d="M6 6h15l-1.5 9h-12z" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
                <path d="M6 6L4 2H2" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--accent-gold)] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="flex items-center justify-center active:scale-95 active:opacity-80 transition-all duration-150"
              style={{ 
                width: '40px', 
                height: '40px',
                minWidth: '0',
                minHeight: '40px',
                flexShrink: 0,
              }}
            >
              <svg 
                width="25" 
                height="25" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                className="text-[var(--text-primary)]"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-[var(--border-subtle)]">
            <div className="flex flex-col gap-4">
              <button
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-left uppercase font-medium"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
                onClick={() => {
                  setSearchModalOpen(true);
                  setMobileMenuOpen(false);
                }}
              >
                SEARCH
              </button>
              <button
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-left uppercase font-medium"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
                onClick={() => {
                  setGalleriesModalOpen(true);
                  setMobileMenuOpen(false);
                }}
              >
                GALLERIES
              </button>
              <Link
                href="/contact"
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-left uppercase font-medium"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                }}
              >
                CONTACT
              </Link>
            </div>
          </nav>
        )}
      </div>
      </header>

      {/* Modals */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
      <ContactModal isOpen={contactModalOpen} onClose={closeContactModal} />
      <GalleriesModal isOpen={galleriesModalOpen} onClose={() => setGalleriesModalOpen(false)} />
      <FavoritesModal />
    </>
  );
}
