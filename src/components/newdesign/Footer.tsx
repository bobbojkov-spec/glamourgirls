import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[var(--bg-page)] border-t border-[var(--border-subtle)] pt-8 md:pt-12">
      <div className="w-full">
        <div className="bg-[var(--bg-surface)] rounded-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Links */}
            <nav className="flex flex-wrap gap-6 justify-center md:justify-start">
              <Link 
                href="/newdesign" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                Home
              </Link>
              <Link 
                href="/newdesign/archive" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                Archive
              </Link>
              <Link 
                href="/newdesign/photos" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                Photos
              </Link>
              <Link 
                href="/contact" 
                className="text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors text-xs"
              >
                Contact
              </Link>
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

