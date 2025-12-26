'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/components/newdesign';
import SearchPanel, { SearchFilters, YearFilterValue } from '@/components/search/SearchPanel';
import ActressTable, { ActressRow } from '@/components/ui/ActressTable';
import type { SearchActressResult } from '@/types/search';
import '../newdesign/design-tokens.css';

async function fetchActresses(filters: SearchFilters) {
  try {
    const params = new URLSearchParams();

    if (filters.nameStartsWith) params.set('nameStartsWith', filters.nameStartsWith);
    if (filters.surnameStartsWith) params.set('surnameStartsWith', filters.surnameStartsWith);
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.newEntry !== 'all') params.set('isNew', filters.newEntry);
    if (filters.newPhotos !== 'all') params.set('hasNewPhotos', filters.newPhotos);

    // Handle years filter
    if (filters.years.length > 0 && !filters.years.includes('all')) {
      // Check for "Their Men" filter
      if (filters.years.includes('men')) {
        params.set('theirMan', 'true');
      }

      // Handle era filters (can be multiple)
      const eras = filters.years.filter((y) => y !== 'men' && y !== 'all');
      if (eras.length > 0) {
        // For now, use the first era (we can enhance this later for multiple)
        params.set('era', eras[0]);
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

export default function NewSearchClient() {
  const searchParams = useSearchParams();
  const [actresses, setActresses] = useState<ActressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    newEntry: 'all',
    newPhotos: 'all',
    years: ['all'] as [YearFilterValue],
    nameStartsWith: searchParams.get('nameStartsWith') || '',
    surnameStartsWith: searchParams.get('surnameStartsWith') || '',
    keyword: searchParams.get('keyword') || '',
  });

  // Update filters when URL params change
  useEffect(() => {
    // Use functional update pattern for consistency
    setFilters(prev => ({
      newEntry: 'all',
      newPhotos: 'all',
      years: ['all'] as [YearFilterValue],
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
          // Map typed SearchActressResult[] to ActressRow format for table component
          const mappedActresses: ActressRow[] = data.map((actress: SearchActressResult) => ({
            id: actress.id.toString(),
            name: actress.name,
            slug: actress.slug,
            years: actress.years || actress.decade || '',
            photoCount: actress.photoCount || 0,
            hqPhotoCount: actress.hqPhotoCount || 0,
            isNew: actress.isNew,
            hasNewPhotos: actress.hasNewPhotos,
            theirMan: actress.theirMan, // Pass theirMan flag
          }));

          setActresses(mappedActresses);
        } else {
          // Fallback: handle unexpected response format
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

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />

      <main className="flex-1">
        {/* Hero Section - Same background as actress pages */}
        <section className="relative w-full py-[68px] overflow-hidden min-h-[51vh]" style={{ backgroundColor: '#f6e5c0' }}>
          <div className="mx-auto max-w-7xl px-6 flex flex-col justify-center items-center h-full">
            {/* Search Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <h1
                className="mb-4 font-normal"
                style={{
                  fontFamily: 'var(--font-logo-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 'clamp(3.8rem, 11vw, 11.5rem)',
                  lineHeight: '1.05',
                  letterSpacing: '0',
                  fontWeight: 400,
                  textTransform: 'none',
                }}
              >
                Search
              </h1>
            </div>

            {/* Search Panel - from search page */}
            <div className="w-full max-w-4xl">
              <div className="bg-[#E6D9B3] rounded-lg shadow-lg p-6 md:p-8 border border-black/10">
                <SearchPanel compact initialFilters={filters} onSearch={handleSearch} />
              </div>
            </div>
          </div>
        </section>

        {/* Results Section - from search page */}
        <section className="px-6 py-8 bg-[var(--bg-page)]">
          <div className="max-w-[1600px] mx-auto">
            <div className="w-full px-6">
              {/* Results count */}
              {!loading && (
                <div className="text-center mb-6">
                  <p className="text-gray-600" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px' }}>
                    <strong>{actresses.length}</strong> records found
                  </p>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div className="text-center text-gray-500 py-12" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                  Loading...
                </div>
              )}

              {/* Results Table */}
              {!loading && actresses.length > 0 && (
                <div className="bg-white/50 rounded-lg shadow-md p-6 md:p-8 border border-black/10">
                  <ActressTable actresses={actresses} />
                </div>
              )}

              {/* No results */}
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
    </div>
  );
}


