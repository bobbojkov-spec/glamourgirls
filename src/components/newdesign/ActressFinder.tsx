'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchIndexService } from '@/lib/searchIndex';

interface AutocompleteSuggestion {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  slug: string;
}

export default function ActressFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasIndexLoaded, setHasIndexLoaded] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preload search index on first focus
  const handleFocus = useCallback(() => {
    if (!hasIndexLoaded) {
      searchIndexService.preload().then(() => {
        setHasIndexLoaded(true);
      }).catch(() => {
        // Silently fail - will fall back to server search
      });
    }
    if (suggestions.length > 0 && searchQuery.length >= 3) {
      setShowSuggestions(true);
    }
  }, [hasIndexLoaded, suggestions.length, searchQuery.length]);

  // Client-side filtering using search index
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const { matches } = await searchIndexService.filter({
        keyword: query,
      });

      // Limit to top 10 suggestions for performance
      const limitedMatches = matches.slice(0, 10);

      const formattedSuggestions: AutocompleteSuggestion[] = limitedMatches.map((actress) => ({
        id: actress.id,
        name: `${actress.firstname} ${actress.middlenames ? actress.middlenames + ' ' : ''}${actress.familiq}`.trim(),
        firstName: actress.firstname,
        lastName: actress.familiq,
        slug: actress.slug,
      }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(formattedSuggestions.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error filtering suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AutocompleteSuggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Navigate to actress page
    if (suggestion.slug) {
      router.push(`/actress/${suggestion.slug}`);
    } else {
      router.push(`/actress/${suggestion.id}`);
    }
  };

  // Handle search button click or Enter key - navigate immediately using client-side index
  const handleSearch = useCallback(async () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 3) {
      setShowSuggestions(false);
      
      // Navigate immediately - don't wait for server response
      // Server-side search will refine results after navigation
      router.push(`/search?keyword=${encodeURIComponent(trimmedQuery)}`);
    }
  }, [searchQuery, router]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-[var(--bg-page)]">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-3">
          Search actresses
        </p>

        <div className="relative">
          <div className="relative flex items-center rounded-lg overflow-hidden border border-gray-300">
            {/* Magnifying Glass Icon on Left */}
            <div className="absolute left-4 z-10 pointer-events-none">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder="Type at least 3 letters to search..."
              className="flex-1 pl-12 pr-0 py-3 border-0 rounded-l-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute right-20 z-10">
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            
            {/* Search Button - Darker Glamour Girls Colors */}
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searchQuery.trim().length < 3}
              className="px-6 py-3 rounded-r-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: searchQuery.trim().length >= 3 ? '#8b6f2a' : '#6f5718',
                color: '#ffffff',
                borderLeft: '1px solid #6f5718',
              }}
              onMouseEnter={(e) => {
                if (searchQuery.trim().length >= 3) {
                  e.currentTarget.style.backgroundColor = '#6f5718';
                }
              }}
              onMouseLeave={(e) => {
                if (searchQuery.trim().length >= 3) {
                  e.currentTarget.style.backgroundColor = '#8b6f2a';
                }
              }}
            >
              Search
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100' : ''
                  } ${index === 0 ? 'rounded-t-lg' : ''} ${
                    index === suggestions.length - 1 ? 'rounded-b-lg' : ''
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="font-medium text-gray-900">{suggestion.name}</div>
                  {(suggestion.firstName || suggestion.lastName) && (
                    <div className="text-sm text-gray-500 mt-0.5">
                      {suggestion.firstName} {suggestion.lastName}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
