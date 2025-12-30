'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/newdesign';
import SearchPanel, { SearchFilters, YearFilterValue } from '@/components/search/SearchPanel';
import type { SearchActressResult } from '@/types/search';
import './newdesign/design-tokens.css';

// Latest Additions Grid Component - Responsive layout:
// Mobile: 2 columns × 2 rows = 4 items max
// Tablet: 3 columns × 2 rows = 6 items max
// Desktop: 1 row only, 3-5 items depending on viewport
function LatestAdditionsGrid({ actresses }: { actresses: SearchActressResult[] }) {
  const [displayedItems, setDisplayedItems] = useState<SearchActressResult[]>([]);
  const [columnCount, setColumnCount] = useState(2);

  // Filter out actresses with no gallery images (placeholders) - memoized to prevent infinite loops
  const actressesWithImages = useMemo(() => {
    return actresses.filter((actress) => {
      if (!actress.previewImageUrl) return false;
      const imageUrl = actress.previewImageUrl.toLowerCase();
      return !imageUrl.includes('placeholder') && 
             !imageUrl.includes('placeholder-portrait') &&
             !imageUrl.includes('placeholder-man');
    });
  }, [actresses]);

  useEffect(() => {
    const calculateDisplayedItems = () => {
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const totalItems = actressesWithImages.length;
      let cols: number;
      let maxItems: number;

      if (viewportWidth < 640) {
        // Mobile: 2 columns × 2 rows = 4 items max
        cols = 2;
        maxItems = 4;
      } else if (viewportWidth < 1024) {
        // Tablet: 3 columns × 2 rows = 6 items max
        cols = 3;
        maxItems = 6;
      } else {
        // Desktop: 1 row only, 3-5 items depending on viewport
        // Determine columns based on viewport width
        if (viewportWidth >= 1400) {
          cols = 5; // Very wide: 5 items
          maxItems = 5;
        } else if (viewportWidth >= 1200) {
          cols = 4; // Wide: 4 items
          maxItems = 4;
        } else {
          cols = 3; // Standard desktop: 3 items
          maxItems = 3;
        }
      }

      setColumnCount(cols);

      // Calculate items to show (never exceed maxItems, and ensure complete rows)
      const itemsToShow = Math.min(totalItems, maxItems);
      const completeRows = Math.floor(itemsToShow / cols);
      const finalCount = completeRows * cols;
      
      setDisplayedItems(actressesWithImages.slice(0, finalCount));
    };

    calculateDisplayedItems();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', calculateDisplayedItems);
      return () => window.removeEventListener('resize', calculateDisplayedItems);
    }
  }, [actressesWithImages]);

  return (
    <div 
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gap: 'clamp(1rem, 2.5vw, 2rem)', // Fluid gap: 16px mobile → 32px desktop (24-32px)
        rowGap: 'clamp(1.5rem, 3vw, 2rem)', // Fluid row gap: 24px mobile → 32px desktop
      }}
    >
      {displayedItems.map((actress) => {
        const profileUrl = actress.slug 
          ? `/actress/${actress.id}/${actress.slug}`
          : `/actress/${actress.id}`;
        
        return (
          <div
            key={actress.id}
            className="flex flex-col w-full"
          >
            {/* Portrait Thumbnail - Strict 3:4 ratio (vertical portrait), clickable to detail page - SIGNIFICANTLY smaller than Featured */}
            <Link
              href={profileUrl}
              className="w-full bg-[var(--bg-surface-alt)] overflow-hidden block lg:hover:scale-[1.03] transition-transform transition-shadow duration-200"
              style={{
                width: '100%',
                aspectRatio: '3/4',
                maxWidth: '100%',
                // NO maxHeight - aspect ratio controls dimensions at all breakpoints
                // Portrait orientation is enforced by aspectRatio: 3/4 (height > width)
                minHeight: 0,
                borderRadius: '7px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                cursor: 'pointer',
                marginBottom: 'clamp(10px, 1.2vw, 14px)', // Image → name spacing
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (window.innerWidth >= 1024) {
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
              }}
            >
              <img
                src={actress.previewImageUrl}
                alt={`${actress.name} gallery image`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  borderRadius: '7px',
                  display: 'block',
                }}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.includes('placeholder')) {
                    img.src = '/images/placeholder-portrait.png';
                  }
                }}
              />
            </Link>
            
            {/* Actress Name - Always Visible, clickable to profile - Larger font relative to image */}
            <div className="flex flex-col" style={{ gap: 'clamp(4px, 0.4vw, 6px)' }}>
              <Link
                href={profileUrl}
                className="text-[var(--text-primary)] text-center leading-tight"
                style={{ 
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 'clamp(15px, 0.35vw + 14.5px, 16.5px)', // 1px bigger than before
                  fontWeight: 500,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  letterSpacing: '0.01em',
                  textDecoration: 'none',
                }}
              >
                {actress.name}
              </Link>
              
              {/* Years / Metadata - Optional */}
              {actress.years && (
                <span 
                  className="text-center"
                  style={{ 
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontSize: '14px', // 2px bigger (was 12px)
                    color: 'var(--text-secondary)',
                    opacity: 0.7,
                    letterSpacing: '0.02em',
                  }}
                >
                  {actress.years}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Production-ready error logging (only in development)
const logError = (message: string, error?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, error);
  }
};

const logWarn = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(message);
  }
};

// Fetch actresses function (reused from search)
const defaultFilters: SearchFilters = {
  newEntry: 'all',
  newPhotos: 'all',
  years: ['all'] as [YearFilterValue],
  nameStartsWith: '',
  surnameStartsWith: '',
  keyword: '',
};

async function fetchActresses(filters: SearchFilters = defaultFilters): Promise<SearchActressResult[]> {
  try {
    const params = new URLSearchParams();

    if (filters.nameStartsWith) params.set('nameStartsWith', filters.nameStartsWith);
    if (filters.surnameStartsWith) params.set('surnameStartsWith', filters.surnameStartsWith);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.newEntry !== 'all') params.set('isNew', filters.newEntry);
    if (filters.newPhotos !== 'all') params.set('hasNewPhotos', filters.newPhotos);

    // Handle years filter
    if (filters.years && Array.isArray(filters.years) && filters.years.length > 0 && !filters.years.includes('all')) {
      if (filters.years.includes('men')) {
        params.set('theirMan', 'true');
      }
      const eras = filters.years.filter((y) => y !== 'men' && y !== 'all');
      if (eras.length > 0) {
        params.set('era', eras[0]);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    // Add orderBy=created_at for Latest Additions queries
    const url = `${baseUrl}/api/actresses?${params.toString()}`;
    const res = await fetch(url);

    if (!res.ok) {
      logWarn(`API returned error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (data && data.error) {
      return [];
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logError('Error fetching actresses:', error);
    return [];
  }
}

export default function HomePage() {
  const [featuredActresses, setFeaturedActresses] = useState<SearchActressResult[]>([]);
  const [displayedFeaturedActresses, setDisplayedFeaturedActresses] = useState<SearchActressResult[]>([]);
  const [latestActresses, setLatestActresses] = useState<SearchActressResult[]>([]);
  const [heroImagePath, setHeroImagePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const featuredGridRef = useRef<HTMLDivElement>(null);

  // Fetch featured actresses (only those marked as featured in admin)
  useEffect(() => {
    setLoading(true);
    // Fetch only featured actresses
    fetchActresses({ years: ['all'] as [YearFilterValue], newEntry: 'all', newPhotos: 'all', nameStartsWith: '', surnameStartsWith: '', keyword: '' })
      .then((data) => {
        // Filter to only featured actresses with gallery images, ordered by featured_order
        const featured = data
          .filter(a => {
            // Must be featured
            if (!a.isFeatured) return false;
            // Must have gallery images (exclude placeholder and zero photo count)
            if (a.photoCount === 0 || !a.photoCount) return false;
            if (a.previewImageUrl && a.previewImageUrl.includes('placeholder')) return false;
            return true;
          })
          .sort((a, b) => {
            // Sort by featured_order, then by name if order is null
            const aOrder = a.featuredOrder ?? null;
            const bOrder = b.featuredOrder ?? null;
            if (aOrder !== null && bOrder !== null) {
              return aOrder - bOrder;
            }
            if (aOrder !== null) return -1;
            if (bOrder !== null) return 1;
            return a.name.localeCompare(b.name);
          })
          .slice(0, 8); // Limit to 8
        setFeaturedActresses(featured);
      })
      .catch((error) => {
        logError('Error fetching featured actresses:', error);
        setFeaturedActresses([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Calculate column count and display only complete rows
  useEffect(() => {
    if (featuredActresses.length === 0) {
      setDisplayedFeaturedActresses([]);
      return;
    }

    function calculateDisplayedItems() {
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
      
      // Determine column count and items to show based on viewport
      let columnCount: number;
      let maxItems: number;
      
      if (viewportWidth < 640) {
        // Mobile: 2 columns, show 4 items (2 rows)
        columnCount = 2;
        maxItems = 4;
      } else if (viewportWidth < 1024) {
        // Medium: 3 columns, show 6 items (2 rows)
        columnCount = 3;
        maxItems = 6;
      } else {
        // Desktop: 4 columns, show 8 items (2 rows)
        columnCount = 4;
        maxItems = 8;
      }
      
      // Show only complete rows - never partial rows
      const availableItems = Math.min(maxItems, featuredActresses.length);
      const completeRows = Math.floor(availableItems / columnCount);
      const finalCount = completeRows * columnCount;
      
      setDisplayedFeaturedActresses(featuredActresses.slice(0, finalCount));
    }

    // Calculate on mount and resize
    calculateDisplayedItems();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', calculateDisplayedItems);
      return () => window.removeEventListener('resize', calculateDisplayedItems);
    }
  }, [featuredActresses]);

  // Fetch latest additions from cached server-side API
  // STRICT RULES: Only show section if we have 4-6 items with valid images
  useEffect(() => {
    setLoadingLatest(true);
    const fetchLatest = async () => {
      try {
        // Use cached API endpoint (server-side cached for 1 hour)
        const response = await fetch('/api/latest-additions?minItems=4&maxItems=6', {
          // Use Next.js fetch cache (if available) or rely on API route caching
          cache: 'force-cache',
          next: { revalidate: 3600 }, // Revalidate every hour
        });
        
        if (!response.ok) {
          // On error, don't render section (reliability > completeness)
          setLatestActresses([]);
          return;
        }
        
        const data = await response.json();
        
        // Ensure we have an array
        const actresses: SearchActressResult[] = Array.isArray(data) ? data : [];
        
        // STRICT RULE: Only set if we have at least 4 items (API already filters placeholders)
        if (actresses.length >= 4) {
          setLatestActresses(actresses.slice(0, 6)); // Max 6 items
        } else {
          // Not enough items - don't render section
          setLatestActresses([]);
        }
      } catch (error) {
        // On error, don't render section (silence is better than wrong data)
        logError('Error fetching latest additions:', error);
        setLatestActresses([]);
      } finally {
        setLoadingLatest(false);
      }
    };
    
    fetchLatest();
  }, []);

  // Fetch hero image on mount
  useEffect(() => {
    async function fetchHeroImage() {
      try {
        const res = await fetch('/api/hero-image');
        const data = await res.json();
        if (res.ok && data.success && data.heroImagePath) {
          setHeroImagePath(data.heroImagePath);
        }
      } catch (error) {
        // Silently fail - hero image is optional
        logWarn('Could not load hero image');
      }
    }
    fetchHeroImage();
  }, []);

  // Handle search submission
  const handleSearch = (filters: SearchFilters) => {
    // Navigate to search page with filters
    const params = new URLSearchParams();
    if (filters.nameStartsWith) params.set('nameStartsWith', filters.nameStartsWith);
    if (filters.surnameStartsWith) params.set('surnameStartsWith', filters.surnameStartsWith);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.newEntry !== 'all') params.set('isNew', filters.newEntry);
    if (filters.newPhotos !== 'all') params.set('hasNewPhotos', filters.newPhotos);
    if (filters.years && filters.years.length > 0 && !filters.years.includes('all')) {
      if (filters.years.includes('men')) {
        params.set('theirMan', 'true');
      } else {
        params.set('era', filters.years[0]);
      }
    }
    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]" style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Header />

      <main className="flex-1" style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        {/* Hero Section - Key Visual Only */}
        <section 
          className="w-full flex justify-center px-3 sm:px-4 md:px-6 lg:px-8" 
          style={{ 
            backgroundColor: '#c3b489', 
            minWidth: 0, 
            maxWidth: '100%',
            paddingTop: '2rem',
            paddingBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '1400px',
              height: '500px',
              maxWidth: '100%',
              backgroundColor: '#c3b489',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <img
              src={
                heroImagePath 
                  ? (heroImagePath.startsWith('http') ? heroImagePath : (heroImagePath.startsWith('/') ? heroImagePath : `/${heroImagePath}`))
                  : '/GG_KEY_ VISUAL.jpg'
              }
              alt="Glamour Girls"
              style={{
                height: '100%',
                maxHeight: '100%',
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                display: 'block',
                position: 'relative',
                zIndex: 10,
              }}
              loading="eager"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('GG_KEY') && !img.src.includes('placeholder')) {
                  img.src = '/GG_KEY_ VISUAL.jpg';
                }
              }}
            />
          </div>
        </section>

        {/* Search Section */}
        <section className="w-full py-8 sm:py-10 md:py-14 lg:py-16 px-3 sm:px-4 md:px-6 lg:px-8 bg-[var(--bg-page)]" style={{ minWidth: 0, maxWidth: '100%' }}>
          <div className="max-w-7xl mx-auto" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
            <div className="w-full flex justify-center">
              <div 
                className="bg-[#E6D9B3] rounded-lg w-full max-w-[700px]"
                style={{
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  minWidth: '280px',
                }}
              >
                <SearchPanel 
                  compact 
                  initialFilters={{ 
                    years: ['all'] as [YearFilterValue],
                    newEntry: 'all',
                    newPhotos: 'all',
                    nameStartsWith: '',
                    surnameStartsWith: '',
                    keyword: ''
                  }} 
                  onSearch={handleSearch} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Featured Actresses */}
        <section className="w-full pb-8 sm:pb-10 md:pb-14 lg:pb-16 pt-0 px-3 sm:px-4 md:px-6 lg:px-8 bg-[var(--bg-page)]" style={{ minWidth: 0, maxWidth: '100%', paddingTop: 0 }}>
          <div className="max-w-7xl mx-auto" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
            {/* Section Title */}
            <div 
              className="mb-8 md:mb-10 lg:mb-10"
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h2 
                className="text-[var(--text-primary)]"
                style={{ 
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 'clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)', // Fluid: 28px mobile → 40px desktop
                  fontWeight: 500,
                  textAlign: 'center',
                  letterSpacing: '0.1em',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                Featured Actresses
              </h2>
            </div>

            {loading ? (
              <div 
                className="text-center text-[var(--text-secondary)] py-8"
                style={{ 
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 'clamp(0.8125rem, 0.3vw + 0.75rem, 0.9375rem)', // Fluid: 13px mobile → 15px desktop, smooth scaling
                  letterSpacing: '0.01em',
                }}
              >
                Loading...
              </div>
            ) : featuredActresses.length > 0 ? (
              <>
                <div 
                  ref={featuredGridRef}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  style={{
                    gap: 'clamp(0.75rem, 2vw, 1.875rem)', // Fluid gap: 12px mobile → 30px desktop
                    rowGap: 'clamp(1.25rem, 2.5vw, 2.25rem)', // Fluid row gap: 20px mobile → 36px desktop
                  }}
                >
                {displayedFeaturedActresses.map((actress) => {
                  // Always use slug-based URL (slug should always exist)
                  const profileUrl = actress.slug 
                    ? `/actress/${actress.id}/${actress.slug}`
                    : `/actress/${actress.id}`;
                  
                  return (
                    <div
                      key={actress.id}
                      className="flex flex-col w-full"
                    >
                      {/* Portrait Thumbnail - Strict 3:4 ratio (vertical portrait), clickable to detail page */}
                      <Link
                        href={profileUrl}
                        className="w-full bg-[var(--bg-surface-alt)] overflow-hidden block lg:hover:scale-[1.03] transition-transform transition-shadow duration-200"
                        style={{
                          width: '100%',
                          aspectRatio: '3/4',
                          maxWidth: '100%',
                          // NO maxHeight - aspect ratio controls dimensions at all breakpoints
                          // Portrait orientation is enforced by aspectRatio: 3/4 (height > width)
                          borderRadius: '7px', // Subtle rounded corners (6-8px range)
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', // Very soft shadow for grounding
                          cursor: 'pointer',
                          marginBottom: 'clamp(12px, 1.5vw, 16px)', // Image → name: 12-16px
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          // Desktop only: subtle shadow increase on hover
                          if (window.innerWidth >= 1024) {
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
                        }}
                      >
                        <img
                          src={actress.previewImageUrl}
                          alt={`${actress.name} gallery image`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            borderRadius: '7px', // Match container radius
                            display: 'block',
                          }}
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget;
                            if (!img.src.includes('placeholder')) {
                              img.src = '/images/placeholder-portrait.png';
                            }
                          }}
                        />
                      </Link>
                      
                      {/* Actress Name - Always Visible, clickable to profile */}
                      <div className="flex flex-col" style={{ gap: 'clamp(6px, 0.5vw, 8px)' }}>
                        <Link
                          href={profileUrl}
                          className="text-[var(--text-primary)] text-center leading-tight"
                          style={{ 
                            fontFamily: '"Cormorant Garamond", Georgia, serif',
                            fontSize: 'clamp(16px, 0.4vw + 16px, 18px)', // 1px bigger (was 15-17px)
                            fontWeight: 500,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            letterSpacing: '0.01em',
                            textDecoration: 'none',
                          }}
                        >
                          {actress.name}
                        </Link>
                        
                        {/* Years / Metadata - Optional */}
                        {actress.years && (
                          <span 
                            className="text-center"
                            style={{ 
                              fontFamily: '"Cormorant Garamond", Georgia, serif',
                              fontSize: '14px', // 2px bigger (was 12px)
                              color: 'var(--text-secondary)',
                              opacity: 0.7,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {actress.years}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </>
            ) : (
              <div 
                className="text-center text-[var(--text-secondary)] py-8"
                style={{ 
                  fontFamily: '"Cormorant Garamond", Georgia, serif',
                  fontSize: 'clamp(0.8125rem, 0.3vw + 0.75rem, 0.9375rem)', // Fluid: 13px mobile → 15px desktop, smooth scaling
                  letterSpacing: '0.01em',
                }}
              >
                No actresses found
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Explore by Decade */}
        <section className="w-full py-8 sm:py-10 md:py-14 lg:py-16 px-3 sm:px-4 md:px-6 lg:px-8 bg-[var(--bg-page)]" style={{ minWidth: 0, maxWidth: '100%' }}>
          <div className="max-w-7xl mx-auto" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
            {/* Section Title */}
            <div 
              className="mb-8 md:mb-10 lg:mb-10"
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h2 
                className="text-[var(--text-primary)]"
                style={{ 
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 'clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)', // Fluid: 28px mobile → 40px desktop
                  fontWeight: 500,
                  textAlign: 'center',
                  letterSpacing: '0.1em',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                Explore by Decade
              </h2>
            </div>

            {/* Decade Cards - Always 2 columns on mobile/tablet, 4 on desktop */}
            <div 
              className="grid max-w-4xl mx-auto decade-grid"
              style={{
                gap: 'clamp(0.75rem, 2vw, 1.5rem)', // Fluid gap: 12px mobile → 24px desktop
                minWidth: 0,
                width: '100%',
                maxWidth: '100%',
              }}
            >
              {[
                { label: '1930s', era: '1930s' },
                { label: '1940s', era: '1940s' },
                { label: '1950s', era: '1950s' },
                { label: '1960s', era: '1960s' },
              ].map((decade) => (
                <Link
                  key={decade.era}
                  href={`/explore/${decade.era}`}
                  className="flex flex-col items-center justify-center p-6 md:p-8 bg-[var(--bg-surface-alt)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:ring-offset-2 w-full"
                  style={{
                    minHeight: '100px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                  aria-label={`Browse actresses from the ${decade.label}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-gold)';
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(200, 164, 93, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.06)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                  }}
                >
                  <span 
                    className="text-[var(--text-primary)]"
                    style={{ 
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontSize: 'clamp(1.0625rem, 0.3vw + 0.875rem, 1.125rem)', // Fluid: 17px mobile → 18px desktop (+2px)
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {decade.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Latest Additions */}
        {/* STRICT RULE: Only render entire section if we have 4-6 items with valid images */}
        {/* No loading state, no empty state, no placeholders - section disappears if data unavailable */}
        {!loadingLatest && latestActresses.length >= 4 && latestActresses.length <= 6 && (
          <section className="w-full py-8 sm:py-10 md:py-14 lg:py-16 px-3 sm:px-4 md:px-6 lg:px-8 bg-[var(--bg-page)]" style={{ minWidth: 0, maxWidth: '100%' }}>
            <div className="max-w-7xl mx-auto" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
              {/* Section Title */}
              <div 
                className="mb-8 md:mb-10 lg:mb-10"
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <h2 
                  className="text-[var(--text-primary)]"
                  style={{ 
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 'clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem)', // Fluid: 28px mobile → 40px desktop
                    fontWeight: 500,
                    textAlign: 'center',
                    letterSpacing: '0.1em',
                    margin: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  Latest Additions
                </h2>
              </div>

              <LatestAdditionsGrid actresses={latestActresses} />
            </div>
          </section>
        )}

        {/* Section 4: Archive Entry CTA */}
        <section className="w-full py-8 sm:py-10 md:py-14 lg:py-16 px-3 sm:px-4 md:px-6 lg:px-8 bg-[var(--bg-page)]" style={{ minWidth: 0, maxWidth: '100%' }}>
          <div className="max-w-4xl mx-auto text-center" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
            <p 
              className="mb-6 md:mb-8 text-[var(--text-secondary)]"
              style={{ 
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 'clamp(0.875rem, 0.4vw + 0.75rem, 1rem)', // Fluid: 14px mobile → 16px desktop, smooth scaling
                lineHeight: '1.7',
                letterSpacing: '0.01em',
              }}
            >
              Explore the complete archive of actresses and photographs.
            </p>
            <Link
              href="/search"
              className="inline-block px-8 py-3.5 bg-[var(--accent-gold)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:ring-offset-2"
              style={{ 
                fontFamily: 'var(--font-ui)',
                fontSize: '15px',
                letterSpacing: '0.02em',
              }}
              aria-label="Browse the complete archive of actresses and photographs"
            >
              Browse Full Archive
            </Link>
          </div>
        </section>

        {/* Section 5: Homepage Content Text - Preserved from original homepage */}
        <section className="bg-[var(--bg-page)] px-4 md:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-[var(--text-secondary)] leading-relaxed" style={{ fontFamily: 'Montserrat, var(--font-ui)' }}>
            <p className="mb-4 font-semibold text-[var(--text-primary)] uppercase tracking-[0.2em]">Dedicated to Cheryl Messina</p>
            <p className="mb-4">
              Welcome to our website dedicated to the private lives of some of the most glamorous actresses of the Thirties, Forties, Fifties, and Sixties.
            </p>
            <p className="mb-4 font-semibold text-[var(--text-primary)] uppercase tracking-[0.2em]">
              Information from thousands of newspapers has recently been added to many entries. More to come, including new faces, so please check back often!
            </p>
            <p className="mb-4">
              Our main sources of information are the newspaper and movie magazine gossip columnist of the day such as Earl Wilson, Harrison Carroll, Louella Parsons, Dorothy Kilgallen, Hedda Hopper, Erskine Johnson and Walter Winchell. We also utilize some highly recommended books such as <em>Fallen Angels</em> by Kirk Crivello, <em>Screen Sirens Scream!</em> by Paul Parla and Charles P. Mitchell, <em>Dark City Dames</em> by Eddie Muller, and the great books and articles by esteemed writers Tom Lisanti and Tom Weaver. We sort the information in chronological order. If we come across conflicting details (like birth dates), all facts are provided. For filmographies please use the links to the IMDb. If you have some additional information or are interested in other celebrities of this period, please fill out the contact form and let us know.
            </p>
            <p className="mb-4">
              Special thanks to our friends Roger Bürgler of Gersau, Switzerland; Dino Cerutti of New York City; Humberto Corado of San Salvador, El Salvador; Jack Randall Earles of Mooresville, Indiana; Don Hart of Buford, Georgia; Marc L. Kagan of San Leandro, California; Richard Koper of Amsterdam, Holland; Donna &amp; Paul Parla of Montrose, California; Charles P. Mitchell of Millinocket, Maine; John O&#39;Dowd of Pine Brook, New Jersey; Jonas Varnas of Vilnius, Lithuania; and Paul Woodbine of Warwick, Rhode Island, for their invaluable contributions.
            </p>
            <p className="font-semibold text-[var(--text-primary)]">
              And a very special THANK YOU to Kirk Crivello for his kind and generous support!
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
