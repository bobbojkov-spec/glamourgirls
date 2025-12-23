'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface PhotoArchiveTeaserProps {
  photos?: string[];
  layout?: 'section' | 'card';
  eyebrow?: string;
  description?: string;
  buttonLabel?: string;
}

const fallbackPhotos = ['/images/hero-image.png', '/images/hero-image.png', '/images/hero-image.png', '/images/hero-image.png'];

export default function PhotoArchiveTeaser({
  photos = fallbackPhotos,
  layout = 'section',
  eyebrow,
  description,
  buttonLabel = 'Browse Photos',
}: PhotoArchiveTeaserProps) {
  if (!Array.isArray(photos) || photos.length === 0) {
    return null;
  }

  const sectionClasses =
    layout === 'section'
      ? 'bg-[var(--bg-page)] py-12 md:py-16 px-4 md:px-6 lg:px-8'
      : '';
  const containerClasses =
    layout === 'card'
      ? 'bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6'
      : '';
  const headingAlignment = layout === 'card' ? 'text-left' : 'text-center';

  const content = (
    <div className={containerClasses}>
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-2">
          {eyebrow}
        </p>
      )}
      <h2
        className={`text-[var(--text-primary)] ${headingAlignment}`}
        style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 'var(--h2-size)',
          lineHeight: 'var(--h2-line-height)',
          letterSpacing: 'var(--h2-letter-spacing)',
        }}
      >
        Photo Archive
      </h2>
      <p style={{ marginBottom: '10px' }}></p>

      {description && (
        <p className="text-[var(--text-secondary)] mb-6 text-base leading-relaxed">
          {description}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-page-alt)]">
            <Image
              src={photo}
              alt={`Archive photo ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 45vw, 12vw"
            />
          </div>
        ))}
      </div>

      <div className={layout === 'card' ? 'text-left' : 'text-center'}>
        <Link href="/newdesign/photos">
          <button
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
            <span className="relative z-10">{buttonLabel.toUpperCase()}</span>
            <div 
              className="absolute inset-0 bg-gradient-to-r from-[#1890ff]/20 via-[#1890ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          </button>
        </Link>
      </div>
    </div>
  );

  if (layout === 'section') {
    return (
      <section className={sectionClasses}>
        <div className="max-w-[1440px] mx-auto">{content}</div>
      </section>
    );
  }

  return content;
}
