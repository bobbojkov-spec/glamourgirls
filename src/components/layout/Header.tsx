'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import ContactModal from './ContactModal';
import SearchModal from './SearchModal';

export default function Header() {
  const pathname = usePathname();
  const { toggleCart, itemCount } = useCart();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Hide header in admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      <header className="header">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 max-w-[1400px] mx-auto">
          {/* Left side - Search, Contact icons + Beauty text */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Search icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {/* Contact icon (envelope/letter) */}
            <button
              onClick={() => setIsContactOpen(true)}
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Contact"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </button>

          </div>
          
          {/* Right side - Glamour Girls logo + Cart */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Glamour Girls logo */}
            <Link href="/" className="vintage-script text-gray-400 text-xl sm:text-2xl md:text-3xl hover:text-vintage-gold transition-colors">
              Glamour Girls
            </Link>

            {/* Cart Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCart();
              }}
              className="relative text-gray-300 hover:text-white transition-colors cursor-pointer"
              aria-label={`Shopping cart with ${itemCount} items`}
              style={{ pointerEvents: 'auto' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              
              {/* Item count badge */}
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#1890ff] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}
