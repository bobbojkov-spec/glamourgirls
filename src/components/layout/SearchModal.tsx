'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { searchIndexService } from '@/lib/searchIndex';
import { searchMetadataService } from '@/lib/searchMetadata';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('all');
  // Initialize stats from cache immediately (if available)
  const [stats, setStats] = useState(() => {
    // Try to get cached metadata synchronously
    const cached = searchMetadataService.getMetadataSync();
    return cached || {
      totalEntries: 0,
      totalImages: 0,
      totalHQImages: 0,
    };
  });
  const [isMounted, setIsMounted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Track mount state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset and focus when modal opens - use requestAnimationFrame for reliable timing
  useEffect(() => {
    if (isOpen) {
      // Reset search state when modal opens (fresh start)
      setQuery('');
      setSelectedEra('all');
      setIsSearching(false);
      
      // Preload search index (non-blocking)
      searchIndexService.preload();
      
      // Ensure input is enabled when modal opens
      if (inputRef.current) {
        inputRef.current.disabled = false;
      }
      
      // Focus input immediately using requestAnimationFrame to ensure DOM is ready
      // Use double RAF for maximum reliability across browsers
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (inputRef.current && isOpen) {
            inputRef.current.focus();
          }
        });
      });
    } else {
      // Reset form when modal closes as well
      const timeoutId = setTimeout(() => {
        setQuery('');
        setSelectedEra('all');
        setIsSearching(false);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Load metadata when modal opens (non-blocking, uses cache first)
  useEffect(() => {
    if (isOpen) {
      // Preload metadata (non-blocking)
      searchMetadataService.getMetadata().then((metadata) => {
        setStats(metadata);
      }).catch((error) => {
        console.warn('Error loading search metadata:', error);
        // Keep existing stats (from cache or defaults)
      });
    }
  }, [isOpen]);


  // Check if search is allowed (at least 3 characters OR era is selected)
  const canSearch = query.trim().length >= 3 || (selectedEra && selectedEra !== 'all');

  const handleSearch = useCallback(() => {
    const trimmedQuery = query.trim();
    // Allow search if: (1) at least 3 characters, OR (2) era is selected
    if (trimmedQuery.length >= 3 || (selectedEra && selectedEra !== 'all')) {
      // IMMEDIATE visual feedback - synchronous, no async operations
      setIsSearching(true);
      if (inputRef.current) {
        inputRef.current.blur();
        // Disable input immediately to prevent further typing
        inputRef.current.disabled = true;
      }

      // Build search params synchronously - NEW SEARCH: only include what user selected
      // This explicitly clears all other filters (isNew, hasNewPhotos, nameStartsWith, surnameStartsWith)
      const params = new URLSearchParams();
      if (trimmedQuery.length >= 3) {
        params.set('keyword', trimmedQuery);
      }
      if (selectedEra && selectedEra !== 'all') {
        // Handle "Their Men" filter - use theirMan param instead of era
        if (selectedEra === 'men') {
          params.set('theirMan', 'true');
        } else {
          params.set('era', selectedEra);
        }
      }

      // Navigate IMMEDIATELY - use replace if already on search page to avoid back button issues
      // This is a NEW SEARCH, so it replaces the current URL completely
      const searchUrl = `/search?${params.toString()}`;
      if (pathname === '/search') {
        router.replace(searchUrl);
      } else {
        router.push(searchUrl);
      }
      
      // Close modal immediately after navigation is triggered
      onClose();
    }
  }, [query, selectedEra, router, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Always call handleSearch - it will check canSearch internally
    // This ensures Enter key always gets acknowledged
    handleSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Always call handleSearch - it checks canSearch internally
      // This ensures Enter is ALWAYS captured and acknowledged
      handleSearch();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Always render modal structure but conditionally show it
  // This prevents re-mounting and ensures input is always ready
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none px-4 sm:px-[20%] ${
        isOpen ? 'pointer-events-auto' : ''
      }`}>
        <div
          className={`bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)] w-full pointer-events-auto transform transition-all ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h2
                className="text-[var(--text-primary)]"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: 'var(--h2-size)',
                  letterSpacing: 'var(--h2-letter-spacing)',
                  lineHeight: 'var(--h2-line-height)',
                }}
              >
                Search Archive
              </h2>
              <button
                onClick={onClose}
                className="interactive-icon text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--bg-surface-alt)]"
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-2" style={{ fontFamily: 'var(--font-ui)' }}>
              Search actresses by name, biography, timeline events, and more
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Years Filter - Above Search Input */}
              <div>
                <div className="flex items-center gap-1.5 border border-gray-300 rounded-md p-0.5 bg-white flex-nowrap overflow-x-auto">
                  {['all', '20-30s', '40s', '50s', '60s', 'men'].map(era => (
                    <label key={era} className="flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="radio"
                        name="era"
                        value={era}
                        checked={selectedEra === era}
                        onChange={(e) => setSelectedEra(e.target.value)}
                        className="sr-only peer"
                      />
                      <span className={`interactive-button px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                        selectedEra === era
                          ? 'bg-gray-100 text-gray-700 border border-gray-300'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}>
                        {era === 'men' ? 'Their Men' : era === 'all' ? 'All' : era}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <div className="relative flex items-center rounded-lg overflow-hidden border border-gray-300">
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
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      // Only update if not searching - prevent state updates during navigation
                      if (!isSearching) {
                        setQuery(e.target.value);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="input search text"
                    disabled={isSearching || !isOpen}
                    autoComplete="off"
                    autoFocus={false}
                    tabIndex={isOpen ? 0 : -1}
                    className="flex-1 pl-12 pr-0 py-3 border-0 rounded-l-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-70 disabled:cursor-wait"
                    style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem' }}
                  />

                  {/* Search Button - Darker Glamour Girls Colors */}
                  <button
                    type="submit"
                    disabled={!canSearch || isSearching}
                    className="interactive-button px-6 py-3 rounded-r-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{
                      backgroundColor: canSearch ? '#8b6f2a' : '#6f5718',
                      color: '#ffffff',
                      borderLeft: '1px solid #6f5718',
                    }}
                    onMouseEnter={(e) => {
                      if (canSearch && !isSearching && window.innerWidth >= 768) {
                        e.currentTarget.style.backgroundColor = '#6f5718';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canSearch && !isSearching) {
                        e.currentTarget.style.backgroundColor = '#8b6f2a';
                      }
                    }}
                  >
                    {isSearching ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Searching...</span>
                      </>
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>

                {/* Helper text */}
                <p className="text-xs text-[var(--text-muted)] mt-2 ml-1" style={{ fontFamily: 'var(--font-ui)' }}>
                  {isSearching ? (
                    <span className="text-[var(--accent-gold)]">Searching...</span>
                  ) : canSearch ? (
                    <>
                      Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[10px]">Enter</kbd> or click Search to find results
                    </>
                  ) : (
                    <>Enter at least 3 characters or select a year to search</>
                  )}
                </p>
              </div>
            </form>

            {/* Stats Section - Only render after mount to prevent hydration mismatch */}
            {isMounted && (
              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                    <div className="text-2xl font-bold text-[var(--accent-gold)] mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                      {stats.totalEntries.toLocaleString()}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                      Actresses
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                    <div className="text-2xl font-bold text-[var(--accent-gold)] mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                      {stats.totalImages.toLocaleString()}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                      Photos
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                    <div className="text-2xl font-bold text-[var(--accent-gold)] mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                      {stats.totalHQImages.toLocaleString()}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                      HQ Images
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tips */}
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-[var(--accent-gold-soft)]/20 to-transparent border border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-ui)' }}>
                <strong className="text-[var(--text-primary)]">💡 Tip:</strong> Search works across names, biographies, timeline events, movies, and more. Try searching for specific events, places, or relationships mentioned in the actresses' stories.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
