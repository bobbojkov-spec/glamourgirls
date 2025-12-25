'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AlphabetNav from '../ui/AlphabetNav';
import VintageButton from '../ui/VintageButton';
import { searchIndexService } from '@/lib/searchIndex';

interface SearchPanelProps {
  /** Compact mode for non-homepage use */
  compact?: boolean;
  /** Initial filter values */
  initialFilters?: SearchFilters;
  /** Callback when search is submitted */
  onSearch?: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  newEntry: 'all' | 'yes' | 'no';
  newPhotos: 'all' | 'yes' | 'no';
  years: string[];
  nameStartsWith: string;
  surnameStartsWith: string;
  keyword: string;
}

const defaultFilters: SearchFilters = {
  newEntry: 'all',
  newPhotos: 'all',
  years: ['all'],
  nameStartsWith: '',
  surnameStartsWith: '',
  keyword: '',
};

export default function SearchPanel({ 
  compact = false, 
  initialFilters,
  onSearch 
}: SearchPanelProps) {
  // Reset filters when initialFilters change (e.g., when URL params change)
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || defaultFilters);
  
  // Update filters when initialFilters prop changes (from URL params)
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);
  const [hasResults, setHasResults] = useState<boolean | null>(null);
  const [hasIndexLoaded, setHasIndexLoaded] = useState(false);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  // Preload search index on first focus
  const handleKeywordFocus = useCallback(() => {
    if (!hasIndexLoaded) {
      searchIndexService.preload().then(() => {
        setHasIndexLoaded(true);
      }).catch(() => {
        // Silently fail - will fall back to server search
      });
    }
  }, [hasIndexLoaded]);

  // Client-side instant feedback for search results
  useEffect(() => {
    let cancelled = false;

    async function checkResults() {
      const trimmedKeyword = filters.keyword.trim();
      const hasKeyword = trimmedKeyword.length >= 3;
      const selectedYear = filters.years[0];
      const hasEra = selectedYear && selectedYear !== 'all';

      if (!hasKeyword && !hasEra) {
        setHasResults(null);
        return;
      }

      try {
        const result = await searchIndexService.hasResults({
          keyword: hasKeyword ? trimmedKeyword : undefined,
          era: selectedYear,
        });

        if (!cancelled) {
          setHasResults(result);
        }
      } catch (error) {
        console.warn('Error checking search results:', error);
        if (!cancelled) {
          setHasResults(null);
        }
      }
    }

    // Debounce the check
    const timeoutId = setTimeout(checkResults, 150);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [filters.keyword, filters.years]);

  // Years filter now uses radio buttons, so we just set the selected year
  // Hero search: Auto-search immediately to narrow results
  const handleYearChange = (year: string) => {
    const newFilters: SearchFilters = { ...filters, years: [year] };
    setFilters(newFilters);
    // Immediately refine search with new year filter
    onSearch?.(newFilters);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Allow search if: (1) at least 3 letters in any field, OR (2) a year/era is selected (not 'all')
    const hasValidSearch = 
      (filters.nameStartsWith.length >= 3) ||
      (filters.surnameStartsWith.length >= 3) ||
      (filters.keyword.length >= 3) ||
      (filters.years.length > 0 && !filters.years.includes('all'));
    
    // Always allow search - if no filters, it will show all entries
    onSearch?.(filters);
  };

  // Auto-search when alphabet letters are clicked
  const handleLetterClick = (letter: string, type: 'name' | 'surname') => {
    const currentValue = filters[type === 'name' ? 'nameStartsWith' : 'surnameStartsWith'];
    // Toggle: if same letter clicked, clear; otherwise set to that letter
    const newValue = currentValue === letter ? '' : letter;
    
    const newFilters: SearchFilters = {
      ...filters,
      [type === 'name' ? 'nameStartsWith' : 'surnameStartsWith']: newValue
    };
    setFilters(newFilters);
    
    // Only search if we have at least 3 letters or clearing the search
    if (newValue.length >= 3 || newValue.length === 0) {
      onSearch?.(newFilters);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="space-y-6"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Filters row - centered */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {/* New entry filter - Toggle */}
        <div className="flex items-center gap-3">
          <span 
            className="font-medium text-[var(--text-primary)]"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              opacity: 0.75,
            }}
          >
            New entry
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.newEntry === 'yes'}
              onChange={(e) => {
                // Hero search: Auto-search immediately to narrow results
                const newFilters: SearchFilters = { ...filters, newEntry: e.target.checked ? 'yes' : 'no' };
                setFilters(newFilters);
                onSearch?.(newFilters);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E6D9B3]"></div>
            <span 
              className="ml-3 text-[var(--text-secondary)] w-8 inline-block text-left"
              style={{
                fontSize: '16px', /* Mobile: 16px */
              }}
            >
              {filters.newEntry === 'yes' ? 'Yes' : 'No'}
            </span>
          </label>
        </div>

        {/* New photos filter - Toggle */}
        <div className="flex items-center gap-3">
          <span 
            className="font-medium text-[var(--text-primary)]"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              opacity: 0.75,
            }}
          >
            New Photos
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.newPhotos === 'yes'}
              onChange={(e) => {
                // Hero search: Auto-search immediately to narrow results
                const newFilters: SearchFilters = { ...filters, newPhotos: e.target.checked ? 'yes' : 'no' };
                setFilters(newFilters);
                onSearch?.(newFilters);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E6D9B3]"></div>
            <span 
              className="ml-3 text-[var(--text-secondary)] w-8 inline-block text-left"
              style={{
                fontSize: '16px', /* Mobile: 16px */
              }}
            >
              {filters.newPhotos === 'yes' ? 'Yes' : 'No'}
            </span>
          </label>
        </div>

        {/* Years filter - Radio Buttons */}
        <div className="flex items-center gap-3 flex-nowrap md:flex-wrap">
          <span 
            className="font-medium text-[var(--text-primary)] flex-shrink-0"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              opacity: 0.75,
            }}
          >
            Years
          </span>
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
            {['all', '20-30s', '40s', '50s', '60s', 'men'].map(year => (
              <label key={year} className="flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="radio"
                  name="years"
                  value={year}
                  checked={filters.years[0] === year}
                  onChange={() => handleYearChange(year)}
                  className="sr-only peer"
                />
                <span 
                  className={`interactive-button px-3 py-1.5 rounded-md border ${
                    filters.years[0] === year
                      ? 'border-gray-600 text-gray-900 bg-transparent'
                      : 'border-gray-300 text-gray-700 bg-transparent hover:border-gray-400'
                  }`}
                  style={{
                    fontSize: '13px', /* 3px smaller on mobile (was 16px) */
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {year === 'men' ? 'Their Men' : year}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Keyword and search button */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-stretch w-full max-w-md border border-gray-300 rounded-lg overflow-hidden">
          {/* Magnifying Glass Icon on Left */}
          <div className="absolute left-4 z-10 pointer-events-none flex items-center h-full">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Input */}
          <input
            ref={keywordInputRef}
            id="keyword"
            type="text"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onFocus={handleKeywordFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="input search text"
            className="flex-1 pl-12 pr-0 py-3 border-0 bg-white text-gray-900 placeholder-gray-400 focus:outline-none search-form-input"
            style={{ 
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px', /* Mobile: 16px, Desktop/tablet handled by CSS */
            }}
          />

          {/* Search Button - Darker Glamour Girls Colors */}
          <button
            type="submit"
            className="interactive-button px-6 py-3 font-medium border-l border-gray-300 flex items-center"
            style={{
              backgroundColor: '#8b6f2a',
              color: '#ffffff',
            }}
            onMouseEnter={(e) => {
              if (window.innerWidth >= 768) {
                e.currentTarget.style.backgroundColor = '#6f5718';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8b6f2a';
            }}
          >
            Search
          </button>
        </div>
      </div>
    </form>
  );
}


