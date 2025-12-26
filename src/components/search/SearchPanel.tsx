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

// Canonical type for year filter values
export type YearFilterValue = 'all' | '20-30s' | '40s' | '50s' | '60s' | 'men';

// Canonical type for toggle filter values
export type ToggleFilterValue = 'all' | 'yes' | 'no';

// Canonical SearchFilters interface - used everywhere
export interface SearchFilters {
  newEntry: ToggleFilterValue;
  newPhotos: ToggleFilterValue;
  years: [YearFilterValue]; // Tuple with exactly one value (radio button selection)
  nameStartsWith: string;
  surnameStartsWith: string;
  keyword: string;
}

// Full default object - used for state initialization
const FULL_DEFAULT_FILTERS: SearchFilters = {
  newEntry: 'all',
  newPhotos: 'all',
  years: ['all'],
  nameStartsWith: '',
  surnameStartsWith: '',
  keyword: '',
} as const;

export default function SearchPanel({ 
  compact = false, 
  initialFilters,
  onSearch 
}: SearchPanelProps) {
  // Initialize state with full default object - ensures type safety
  const [filters, setFilters] = useState<SearchFilters>(
    initialFilters ?? FULL_DEFAULT_FILTERS
  );
  
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
  const handleYearChange = (year: YearFilterValue) => {
    // Use functional update to prevent type widening and ensure stability
    setFilters(prev => {
      const newFilters: SearchFilters = { ...prev, years: [year] };
      // Immediately refine search with new year filter
      onSearch?.(newFilters);
      return newFilters;
    });
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
    // Use functional update to prevent type widening and ensure stability
    setFilters(prev => {
      const currentValue = prev[type === 'name' ? 'nameStartsWith' : 'surnameStartsWith'];
      // Toggle: if same letter clicked, clear; otherwise set to that letter
      const newValue = currentValue === letter ? '' : letter;
      
      const newFilters: SearchFilters = {
        ...prev,
        [type === 'name' ? 'nameStartsWith' : 'surnameStartsWith']: newValue
      };
      
      // Only search if we have at least 3 letters or clearing the search
      if (newValue.length >= 3 || newValue.length === 0) {
        onSearch?.(newFilters);
      }
      
      return newFilters;
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .years-filter-row {
          flex-wrap: nowrap !important;
        }
        @media (max-width: 400px) {
          .years-filter-row {
            flex-wrap: wrap !important;
          }
        }
      `}} />
      <form 
        onSubmit={handleSubmit}
        className={compact ? "space-y-3" : "space-y-6"}
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
      {/* Filters row - centered */}
      <div className={`flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4 md:gap-x-8 w-full ${compact ? 'gap-y-2' : 'gap-y-3'}`}>
        {/* New entry filter - Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 0 }}>
          <span 
            className="font-medium text-[var(--text-primary)] flex-shrink-0"
            style={{
              fontSize: 'clamp(11px, 2vw, 13px)',
              fontWeight: 500,
              opacity: 0.75,
              whiteSpace: 'nowrap',
            }}
          >
            New entry
          </span>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={filters.newEntry === 'yes'}
              onChange={(e) => {
                // Use functional update with explicit mapping: checked → 'yes', unchecked → 'no'
                setFilters(prev => {
                  const newValue: ToggleFilterValue = e.target.checked ? 'yes' : 'no';
                  const newFilters: SearchFilters = { ...prev, newEntry: newValue };
                  // Hero search: Auto-search immediately to narrow results
                  onSearch?.(newFilters);
                  return newFilters;
                });
              }}
              className="sr-only peer"
            />
            <div className="w-10 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[#E6D9B3]"></div>
            <span 
              className="ml-2 text-[var(--text-secondary)] flex-shrink-0 text-left"
              style={{
                fontSize: 'clamp(13px, 2vw, 16px)',
                whiteSpace: 'nowrap',
              }}
            >
              {filters.newEntry === 'yes' ? 'Yes' : 'No'}
            </span>
          </label>
        </div>

        {/* New photos filter - Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 0 }}>
          <span 
            className="font-medium text-[var(--text-primary)] flex-shrink-0"
            style={{
              fontSize: 'clamp(11px, 2vw, 13px)',
              fontWeight: 500,
              opacity: 0.75,
              whiteSpace: 'nowrap',
            }}
          >
            New Photos
          </span>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={filters.newPhotos === 'yes'}
              onChange={(e) => {
                // Use functional update with explicit mapping: checked → 'yes', unchecked → 'no'
                setFilters(prev => {
                  const newValue: ToggleFilterValue = e.target.checked ? 'yes' : 'no';
                  const newFilters: SearchFilters = { ...prev, newPhotos: newValue };
                  // Hero search: Auto-search immediately to narrow results
                  onSearch?.(newFilters);
                  return newFilters;
                });
              }}
              className="sr-only peer"
            />
            <div className="w-10 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[#E6D9B3]"></div>
            <span 
              className="ml-2 text-[var(--text-secondary)] flex-shrink-0 text-left"
              style={{
                fontSize: 'clamp(13px, 2vw, 16px)',
                whiteSpace: 'nowrap',
              }}
            >
              {filters.newPhotos === 'yes' ? 'Yes' : 'No'}
            </span>
          </label>
        </div>

      </div>

      {/* Years filter - Toggle Pills - Centered - One line until very small screens */}
      <div className="flex flex-col items-center w-full">
        <div className="flex flex-col items-center" style={{ maxWidth: '100%', width: '100%' }}>
          {/* Years label and buttons in one flex row - only wrap on very small screens (< 400px) */}
          <div 
            className="flex items-center gap-2 sm:gap-3 justify-center years-filter-row"
            style={{ 
              flexWrap: 'nowrap',
            }}
          >
            <span 
              className="font-medium text-[var(--text-primary)] flex-shrink-0"
              style={{
                fontSize: 'clamp(11px, 2vw, 13px)',
                fontWeight: 500,
                opacity: 0.75,
                whiteSpace: 'nowrap',
              }}
            >
              Years
            </span>
            {(['all', '20-30s', '40s', '50s', '60s', 'men'] as const satisfies readonly YearFilterValue[]).map(year => (
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
                  className={`
                    px-2 py-1 sm:px-3 sm:py-1.5 rounded-md border transition-all
                    ${filters.years[0] === year
                      ? 'border-gray-700 bg-gray-700 text-white shadow-sm'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }
                    peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-gray-500 peer-focus-visible:ring-offset-2
                  `}
                  style={{
                    fontSize: 'clamp(11px, 2vw, 13px)',
                    fontFamily: 'DM Sans, sans-serif',
                    whiteSpace: 'nowrap',
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
      <div className={`flex flex-col items-center ${compact ? 'gap-2' : 'gap-4'}`}>
        <div className="relative flex flex-col sm:flex-row items-stretch border border-gray-300 rounded-lg overflow-hidden w-full" style={{ minWidth: '280px', maxWidth: '475px' }}>
          {/* Input with icon inside */}
          <div className="relative flex-1" style={{ minWidth: 0 }}>
            {/* Magnifying Glass Icon inside input */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center" style={{ height: '44px' }}>
              <svg
                className="w-4 h-4 text-gray-500"
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
                // Handle Enter key to submit
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Call onSearch directly with current filters (same as handleSubmit does)
                  onSearch?.(filters);
                  return;
                }
                
                // Handle Ctrl+A (Windows/Linux) or Cmd+A (Mac) to select all
                if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                  e.preventDefault();
                  if (keywordInputRef.current) {
                    keywordInputRef.current.select();
                  }
                  return;
                }
                
                // Handle Delete or Backspace when all text is selected
                if ((e.key === 'Delete' || e.key === 'Backspace') && keywordInputRef.current) {
                  const input = keywordInputRef.current;
                  const isAllSelected = input.selectionStart === 0 && 
                                       input.selectionEnd === input.value.length;
                  if (isAllSelected) {
                    e.preventDefault();
                    setFilters(prev => ({ ...prev, keyword: '' }));
                    return;
                  }
                }
              }}
              placeholder="input search text"
              className="w-full pl-10 pr-0 border-0 bg-white text-gray-900 placeholder-gray-400 focus:outline-none search-form-input"
              style={{ 
                fontFamily: 'DM Sans, sans-serif',
                height: '44px',
                paddingTop: '0',
                paddingBottom: '0',
              }}
            />
          </div>

          {/* Search Button - Darker Glamour Girls Colors */}
          <button
            type="submit"
            className="interactive-button px-5 font-medium border-t sm:border-t-0 sm:border-l border-gray-300 flex items-center justify-center w-full sm:w-auto"
            style={{
              backgroundColor: '#8b6f2a',
              color: '#ffffff',
              fontSize: '14px',
              height: '44px',
              paddingTop: '0',
              paddingBottom: '0',
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
    </>
  );
}


