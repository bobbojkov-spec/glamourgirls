'use client';

import React from 'react';
import Link from 'next/link';
import { useContactModal } from '@/context/ContactModalContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { openModal } = useContactModal();

  return (
    <footer className="w-full bg-[var(--bg-page)] border-t border-[var(--border-subtle)] pt-8 md:pt-12">
      <div className="w-full">
        <div className="bg-[var(--bg-surface)] rounded-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Links */}
            <nav className="flex flex-wrap gap-4 md:gap-6 justify-center md:justify-start">
              <Link 
                href="/" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                Home
              </Link>
              <Link 
                href="/explore/1930s" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                1930s Gallery
              </Link>
              <Link 
                href="/explore/1940s" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                1940s Gallery
              </Link>
              <Link 
                href="/explore/1950s" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                1950s Gallery
              </Link>
              <Link 
                href="/explore/1960s" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                1960s Gallery
              </Link>
              <Link 
                href="/search?isNew=yes" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                New Entries
              </Link>
              <Link 
                href="/search?hasNewPhotos=yes" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                New Photo Additions
              </Link>
              <button
                onClick={openModal}
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                Contact
              </button>
            </nav>

            {/* Copyright */}
            <p className="text-[var(--text-secondary)] text-xs">
              © {currentYear} Glamour Girls of the Silver Screen
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

