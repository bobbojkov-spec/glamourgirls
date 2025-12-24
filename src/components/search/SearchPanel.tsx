'use client';

import { useState } from 'react';
import AlphabetNav from '../ui/AlphabetNav';
import VintageButton from '../ui/VintageButton';

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
  newEntry: 'no',
  newPhotos: 'no',
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
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || defaultFilters);

  // Years filter now uses radio buttons, so we just set the selected year
  const handleYearChange = (year: string) => {
    setFilters(prev => ({ ...prev, years: [year] }));
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
    
    const newFilters = {
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
              onChange={(e) => setFilters(prev => ({ ...prev, newEntry: e.target.checked ? 'yes' : 'no' }))}
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
              onChange={(e) => setFilters(prev => ({ ...prev, newPhotos: e.target.checked ? 'yes' : 'no' }))}
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
        <div className="flex items-center gap-3 flex-wrap">
          <span 
            className="font-medium text-[var(--text-primary)]"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              opacity: 0.75,
            }}
          >
            Years
          </span>
          <div className="flex items-center gap-2 border border-gray-300 rounded-md p-1 bg-white">
            {['all', '20-30s', '40s', '50s', '60s', 'men'].map(year => (
              <label key={year} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="years"
                  value={year}
                  checked={filters.years[0] === year}
                  onChange={() => setFilters(prev => ({ ...prev, years: [year] }))}
                  className="sr-only peer"
                />
                <span 
                  className={`px-3 py-1 rounded transition-all search-form-select ${
                    filters.years[0] === year
                      ? 'bg-[#E6D9B3] text-gray-900 border border-[#d1c4a0]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    fontSize: '16px', /* Mobile: 16px, Desktop/tablet handled by CSS */
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
        <div className="relative flex items-center rounded-lg overflow-hidden border border-gray-300 w-full max-w-md">
          {/* Magnifying Glass Icon on Left */}
          <div className="absolute left-4 z-10 pointer-events-none">
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
            id="keyword"
            type="text"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="input search text"
            className="flex-1 pl-12 pr-0 py-3 border-0 rounded-l-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none search-form-input"
            style={{ 
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px', /* Mobile: 16px, Desktop/tablet handled by CSS */
            }}
          />

          {/* Search Button - Darker Glamour Girls Colors */}
          <button
            type="submit"
            className="px-6 py-3 rounded-r-lg font-medium transition-all duration-200"
            style={{
              backgroundColor: '#8b6f2a',
              color: '#ffffff',
              borderLeft: '1px solid #6f5718',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6f5718';
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


