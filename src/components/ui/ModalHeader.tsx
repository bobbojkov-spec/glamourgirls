'use client';

import React from 'react';

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  closeAriaLabel?: string;
}

/**
 * Shared modal header component for consistent styling across all modals.
 * Used in FavoritesModal, CartDrawer, and other modals.
 */
export default function ModalHeader({ 
  title, 
  onClose, 
  closeAriaLabel = 'Close' 
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 border-b border-[var(--border-subtle)]" style={{ paddingTop: 'clamp(16px, 2vh, 20px)', paddingBottom: 'clamp(16px, 2vh, 20px)' }}>
      <h2
        className="text-[var(--text-primary)]"
        style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 'var(--h2-size)',
          letterSpacing: 'var(--h2-letter-spacing)',
          lineHeight: 'var(--h2-line-height)',
        }}
      >
        {title}
      </h2>
      <button
        onClick={onClose}
        className="interactive-icon text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--state-hover-wash)]"
        style={{
          padding: '10px',
          minWidth: '44px',
          minHeight: '44px',
        }}
        aria-label={closeAriaLabel}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

