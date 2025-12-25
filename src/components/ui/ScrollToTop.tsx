'use client';

import { useState, useEffect, useCallback } from 'react';

interface ScrollToTopProps {
  /** Minimum scroll distance (in pixels) before button appears. Default: 350 for mobile */
  threshold?: number;
  /** Offset from bottom edge. Default: 20 */
  bottomOffset?: number;
  /** Offset from right edge. Default: 20 */
  rightOffset?: number;
}

export default function ScrollToTop({ 
  threshold = 350,
  bottomOffset = 20,
  rightOffset = 20 
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Ensure component only renders on client and check if mobile
  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
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

  // Don't render until mounted (prevents hydration mismatch) or if not mobile
  if (!mounted || !isMobile) {
    return null;
  }

  return (
    <button
      id="scroll-to-top-button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed z-50 flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer md:hidden"
      style={{
        bottom: `${bottomOffset}px`,
        right: `${rightOffset}px`,
        width: '48px',
        height: '48px',
        minWidth: '48px',
        minHeight: '48px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.92)';
        e.currentTarget.style.opacity = '0.85';
      }}
      onTouchEnd={(e) => {
        setTimeout(() => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.opacity = '';
        }, 150);
      }}
    >
      <svg
        width="26"
        height="26"
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

