'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface GalleriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const eras = [
  { slug: '1930s', name: '1930s' },
  { slug: '1940s', name: '1940s' },
  { slug: '1950s', name: '1950s' },
  { slug: '1960s', name: '1960s' },
];

export default function GalleriesModal({ isOpen, onClose }: GalleriesModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleEraClick = (eraSlug: string) => {
    router.push(`/explore/${eraSlug}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)] p-8 max-w-md w-full pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-[var(--text-primary)]"
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 'var(--h2-size)',
                letterSpacing: 'var(--h2-letter-spacing)',
                lineHeight: 'var(--h2-line-height)',
              }}
            >
              Select Era
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {eras.map((era) => (
              <button
                key={era.slug}
                onClick={() => handleEraClick(era.slug)}
                className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium tracking-wide uppercase text-[var(--text-primary)] transition-all duration-300 relative overflow-hidden group"
                style={{
                  backgroundColor: '#fef9eb',
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
                  e.currentTarget.style.backgroundColor = '#fef9eb';
                  e.currentTarget.style.borderColor = '#6f5718';
                }}
              >
                <span className="relative z-10">{era.name}</span>
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-[#1890ff]/20 via-[#1890ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

