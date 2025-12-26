'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Header, Footer } from '@/components/newdesign';
import SearchPanel, { SearchFilters, YearFilterValue } from '@/components/search/SearchPanel';
import ActressTable, { ActressRow } from '@/components/ui/ActressTable';
import ScrollToTop from '@/components/ui/ScrollToTop';
import type { SearchActressResult } from '@/types/search';
import '../newdesign/design-tokens.css';

async function fetchActresses(filters: SearchFilters) {
  try {
    const params = new URLSearchParams();

    if (filters.nameStartsWith) params.set('nameStartsWith', filters.nameStartsWith);
    if (filters.surnameStartsWith) params.set('surnameStartsWith', filters.surnameStartsWith);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.newEntry && filters.newEntry !== 'all') params.set('isNew', filters.newEntry);
    if (filters.newPhotos && filters.newPhotos !== 'all') params.set('hasNewPhotos', filters.newPhotos);

    // Handle years filter - now uses radio buttons so only one value
    if (filters.years.length > 0 && !filters.years.includes('all')) {
      const selectedYear = filters.years[0];
      // Check for "Their Men" filter
      if (selectedYear === 'men') {
        params.set('theirMan', 'true');
      } else {
        // Handle era filters
        params.set('era', selectedYear);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const res = await fetch(`${baseUrl}/api/actresses?${params.toString()}`);

    if (!res.ok) {
      // If API returns error, try to parse it but don't crash
      const errorData = await res.json().catch(() => ({}));
      // Return empty array instead of throwing - let UI show "no results"
      console.warn('API returned error:', errorData.error || `Status ${res.status}`);
      return [] as SearchActressResult[];
    }

    const data = await res.json();

    // Check if response is an error object
    if (data && data.error) {
      console.warn('API returned error in response body:', data.error);
      // Return empty array instead of throwing
      return [] as SearchActressResult[];
    }

    // Type assertion: API returns SearchActressResult[]
    return data as SearchActressResult[];
  } catch (error: any) {
    console.error('Error fetching actresses:', error);
    // Return error object so component can handle it
    return { error: error.message || 'Failed to fetch actresses' };
  }
}

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [actresses, setActresses] = useState<ActressRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Helper to map URL param to filter value
  const getNewEntryFilter = (isNewParam: string | null): 'all' | 'yes' | 'no' => {
    if (isNewParam === 'yes') return 'yes';
    if (isNewParam === 'no') return 'no';
    return 'all';
  };

  const getNewPhotosFilter = (hasNewPhotosParam: string | null): 'all' | 'yes' | 'no' => {
    if (hasNewPhotosParam === 'yes') return 'yes';
    if (hasNewPhotosParam === 'no') return 'no';
    return 'all';
  };

  // Helper to get years from URL params (handles both era and theirMan)
  // Returns tuple with exactly one YearFilterValue
  const getYearsFromParams = (searchParams: URLSearchParams): [YearFilterValue] => {
    const theirMan = searchParams.get('theirMan');
    if (theirMan === 'true') {
      return ['men'];
    }
    const eraParam = searchParams.get('era');
    if (eraParam && ['20-30s', '40s', '50s', '60s'].includes(eraParam)) {
      return [eraParam as YearFilterValue];
    }
    return ['all'];
  };

  const [filters, setFilters] = useState<SearchFilters>({
    newEntry: getNewEntryFilter(searchParams.get('isNew')),
    newPhotos: getNewPhotosFilter(searchParams.get('hasNewPhotos')),
    years: getYearsFromParams(searchParams),
    nameStartsWith: searchParams.get('nameStartsWith') || '',
    surnameStartsWith: searchParams.get('surnameStartsWith') || '',
    keyword: searchParams.get('keyword') || '',
  });

  // Update filters when URL params change (e.g., from nav search or browser back/forward)
  useEffect(() => {
    // Use functional update pattern for consistency
    setFilters(prev => ({
      newEntry: getNewEntryFilter(searchParams.get('isNew')),
      newPhotos: getNewPhotosFilter(searchParams.get('hasNewPhotos')),
      years: getYearsFromParams(searchParams),
      nameStartsWith: searchParams.get('nameStartsWith') || '',
      surnameStartsWith: searchParams.get('surnameStartsWith') || '',
      keyword: searchParams.get('keyword') || '',
    }));
  }, [searchParams]);

  // Initial load and when filters change
  useEffect(() => {
    setLoading(true);
    fetchActresses(filters)
      .then((data) => {
        // API always returns SearchActressResult[] (empty array on error)
        if (Array.isArray(data)) {
          const mappedActresses: ActressRow[] = data.map((actress: SearchActressResult) => ({
            id: actress.id.toString(),
            name: actress.name,
            slug: actress.slug,
            years: actress.years || actress.decade || '',
            photoCount: actress.photoCount || 0,
            hqPhotoCount: actress.hqPhotoCount || 0,
            isNew: actress.isNew,
            hasNewPhotos: actress.hasNewPhotos,
            theirMan: actress.theirMan,
          }));

          setActresses(mappedActresses);
        } else {
          console.error('Unexpected response format:', data);
          setActresses([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching actresses:', error);
        setActresses([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filters]);

  // Helper to convert filters to URL params
  const filtersToUrlParams = (filters: SearchFilters): URLSearchParams => {
    const params = new URLSearchParams();
    
    if (filters.nameStartsWith) params.set('nameStartsWith', filters.nameStartsWith);
    if (filters.surnameStartsWith) params.set('surnameStartsWith', filters.surnameStartsWith);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.newEntry && filters.newEntry !== 'all') params.set('isNew', filters.newEntry);
    if (filters.newPhotos && filters.newPhotos !== 'all') params.set('hasNewPhotos', filters.newPhotos);
    
    // Handle years filter - convert to era or theirMan param
    if (filters.years.length > 0 && !filters.years.includes('all')) {
      const selectedYear = filters.years[0];
      if (selectedYear === 'men') {
        params.set('theirMan', 'true');
      } else {
        params.set('era', selectedYear);
      }
    }
    
    return params;
  };

  // Refine search: preserve existing filters and update URL (hero search behavior)
  // URL update will trigger useEffect to sync filters state, avoiding duplicate updates
  const handleSearch = (newFilters: SearchFilters) => {
    const params = filtersToUrlParams(newFilters);
    const newUrl = `/search?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]" style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Header />
      <main className="flex-1" style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
        {/* Hero Section - Clean Editorial Layout */}
        <section className="w-full py-8 sm:py-10 md:py-14 lg:py-20 px-3 sm:px-4 md:px-6 lg:px-8" style={{ backgroundColor: '#f6e5c0', minWidth: 0, maxWidth: '100%' }}>
          <div className="max-w-7xl mx-auto" style={{ minWidth: 0, width: '100%', maxWidth: '100%' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 xl:gap-16 items-start">
              {/* Left Column: Text Content + Search */}
              <div className="order-1 lg:order-1">
                {/* Headline - Editorial scale, fluid typography */}
                <h1 
                  className="mb-4 md:mb-5 lg:mb-6"
                  style={{ 
                    fontFamily: 'var(--font-logo-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 'clamp(2rem, 3.5vw + 0.5rem, 3.5rem)', // Fluid: 32px mobile → 56px desktop, smooth scaling
                    lineHeight: '1.2',
                    fontWeight: 400,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    wordBreak: 'normal',
                    hyphens: 'auto',
                    maxWidth: '100%', // Prevent overflow
                    textAlign: 'center',
                  }}
                >
                  Search
                </h1>
                
                {/* Subheadline - Clean serif, fluid typography */}
                <p 
                  className="mb-6 md:mb-8 lg:mb-10 text-[#2B2B2B]"
                  style={{ 
                    fontFamily: "'Playfair Display', 'Didot', 'Times New Roman', serif",
                    fontSize: 'clamp(0.875rem, 0.5vw + 0.75rem, 1.125rem)', // Fluid: 14px mobile → 18px desktop, smooth scaling
                    lineHeight: '1.7',
                    fontWeight: 400,
                    letterSpacing: '0.01em',
                    textAlign: 'center',
                  }}
                >
                  Find actresses in our archive.
                </p>
                
                {/* Embedded Search Block - Integrated panel - Compact dropdown style */}
                <div 
                  className="bg-[#E6D9B3] rounded-lg px-2.5 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 lg:py-3"
                  style={{
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    minWidth: 0,
                    width: '100%',
                    maxWidth: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: '100%', maxWidth: '750px', minWidth: '280px' }}>
                    <SearchPanel 
                      compact 
                      initialFilters={filters} 
                      onSearch={handleSearch} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Section */}
        <section className="px-6 bg-[var(--bg-page)] search-results-section" style={{ paddingTop: 'clamp(20px, 3vh, 32px)', paddingBottom: 'clamp(20px, 3vh, 32px)' }}>
          <div className="max-w-[1600px] mx-auto">
            <div className="w-full px-0 md:px-6">
              {!loading && (
                <div className="text-center mb-6">
                  <p 
                    className="text-gray-600" 
                    style={{ 
                      fontFamily: 'DM Sans, sans-serif', 
                      fontSize: '13px',
                      fontWeight: 400,
                      opacity: 0.75,
                    }}
                  >
                    <strong>{actresses.length}</strong> records found
                  </p>
                </div>
              )}

              {loading && (
                <div className="text-center text-gray-500 py-12" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Loading...
                </div>
              )}

              {!loading && actresses.length > 0 && (
                <div className="bg-white/50 rounded-lg shadow-md p-6 md:p-8 border border-black/10">
                  <ActressTable actresses={actresses} />
                </div>
              )}

              {!loading && actresses.length === 0 && (
                <div className="text-center text-gray-500 py-12" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  <p className="text-base mb-2">No actresses found matching your search criteria.</p>
                  <p className="text-sm">Try adjusting your filters.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}


