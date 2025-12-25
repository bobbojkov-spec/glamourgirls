'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import GalleriesModal from './GalleriesModal';

interface HeroHomeProps {
  backgroundImageUrl?: string;
}

export default function HeroHome({ backgroundImageUrl = '/images/hero-image.png' }: HeroHomeProps) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [galleriesModalOpen, setGalleriesModalOpen] = useState(false);

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
    <section className="relative w-full h-[50vh] md:h-[60vh] lg:h-[68vh] overflow-hidden">
      {/* Background Image - No alterations */}
      {backgroundImageUrl && (
        <div className="absolute inset-0">
          <Image
            src={backgroundImageUrl}
            alt="Glamour Girls of the Silver Screen"
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Optional Charcoal Overlay (max 35% opacity) */}
      <div 
        className="absolute inset-0 bg-[var(--bg-hero-overlay)]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4 md:px-6 lg:px-8 max-w-[1440px] mx-auto w-full">
        <div className="max-w-5xl flex flex-col items-center w-full">
          {/* Hero title - Great Vibes */}
          <h1 
            className="mb-4 font-normal text-center"
            style={{ 
              fontFamily: 'var(--font-logo-primary)',
              color: '#FFFDF7',
              fontSize: 'clamp(3.8rem, 11vw, 11.5rem)',
              lineHeight: '1.05',
              letterSpacing: '0',
              fontWeight: 400,
              textShadow: '0 8px 22px rgba(0,0,0,0.55)',
              maxWidth: '80%',
              textTransform: 'none',
              opacity: fontLoaded ? 1 : 0,
              transition: 'opacity 0.2s ease-in',
            }}
          >
            Glamour Girls
          </h1>

          {/* Subtitle - centered */}
          <p 
            className="text-2xl md:text-[28px] lg:text-[34px] text-[var(--text-inverse)] mb-6"
            style={{ fontFamily: 'var(--font-logo-secondary)' }}
          >
            of the Silver Screen
          </p>

          {/* CTA Button */}
          <div className="flex justify-center w-full">
            {/* Dark bg + cream border + cream text */}
            <button 
              onClick={() => setGalleriesModalOpen(true)}
              className="interactive-button px-6 py-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-[var(--state-focus-ring)] bg-[#1E1E1E] border-2 border-[var(--text-inverse)] text-[var(--text-inverse)] hover:opacity-90 w-full sm:w-auto uppercase tracking-[0.25em]"
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              BROWSE PHOTO ARCHIVE
            </button>
          </div>
        </div>
      </div>

      {/* Galleries Modal */}
      <GalleriesModal isOpen={galleriesModalOpen} onClose={() => setGalleriesModalOpen(false)} />
    </section>
  );
}
