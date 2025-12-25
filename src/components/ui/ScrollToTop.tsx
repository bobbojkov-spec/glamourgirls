'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScrollToTopProps {
  /** Minimum scroll distance (in pixels) before button appears. Default: 300 */
  threshold?: number;
  /** Offset from bottom edge. Default: 20 */
  bottomOffset?: number;
  /** Offset from right edge. Default: 20 */
  rightOffset?: number;
}

export default function ScrollToTop({ 
  threshold = 300,
  bottomOffset = 20,
  rightOffset = 20 
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Throttled scroll handler
  const handleScroll = useCallback(() => {
    if (isScrolling || !mounted) return; // Don't check while scrolling or before mount
    
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    setIsVisible(scrollY > threshold);
  }, [threshold, isScrolling, mounted]);

  // Throttle scroll events (check every 100ms)
  useEffect(() => {
    let ticking = false;
    
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Check initial scroll position
    handleScroll();
    
    window.addEventListener('scroll', onScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [handleScroll]);

  // Smooth scroll to top
  const scrollToTop = useCallback(() => {
    setIsScrolling(true);
    
    // Add tap feedback
    const button = document.getElementById('scroll-to-top-button');
    if (button) {
      button.style.transform = 'scale(0.9)';
      button.style.opacity = '0.8';
    }
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Reset tap feedback after animation
    setTimeout(() => {
      if (button) {
        button.style.transform = '';
        button.style.opacity = '';
      }
      setIsScrolling(false);
    }, 300);
  }, []);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  return (
    <button
      id="scroll-to-top-button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed z-50 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer hover:opacity-90 active:scale-95 active:opacity-80"
      style={{
        bottom: `${bottomOffset}px`,
        right: `${rightOffset}px`,
        width: '44px',
        height: '44px',
        minWidth: '44px',
        minHeight: '44px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}

