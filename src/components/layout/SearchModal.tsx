'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('all');
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalImages: 0,
    totalHQImages: 0,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else if (!isOpen) {
      // Reset form when modal closes
      setQuery('');
      setSelectedEra('all');
    }
  }, [isOpen]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
        const res = await fetch(`${baseUrl}/api/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  // Check if search is allowed (at least 3 characters OR era is selected)
  const canSearch = query.trim().length >= 3 || (selectedEra && selectedEra !== 'all');

  const handleSearch = () => {
    const trimmedQuery = query.trim();
    // Allow search if: (1) at least 3 characters, OR (2) era is selected
    if (trimmedQuery.length >= 3 || (selectedEra && selectedEra !== 'all')) {
      const params = new URLSearchParams();
      // Only add keyword if it has at least 3 characters
      if (trimmedQuery.length >= 3) {
        params.set('keyword', trimmedQuery);
      }
      // Add era filter if not "all"
      if (selectedEra && selectedEra !== 'all') {
        params.set('era', selectedEra);
      }
      router.push(`/search?${params.toString()}`);
      onClose();
      setQuery('');
      setSelectedEra('all');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Only submit if we have at least 3 characters
    if (canSearch) {
      handleSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Only allow search if at least 3 characters
      if (canSearch) {
        handleSearch();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none px-4 sm:px-[20%]">
        <div
          className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)] w-full pointer-events-auto transform transition-all"
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
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-lg hover:bg-[var(--bg-surface-alt)]"
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
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
                  Years
                </label>
                <div className="flex items-center gap-2 border border-gray-300 rounded-md p-1 bg-white">
                  {['all', '20-30s', '40s', '50s', '60s', 'men'].map(era => (
                    <label key={era} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="era"
                        value={era}
                        checked={selectedEra === era}
                        onChange={(e) => setSelectedEra(e.target.value)}
                        className="sr-only peer"
                      />
                      <span className={`px-3 py-1 text-sm rounded transition-all ${
                        selectedEra === era
                          ? 'bg-[#E6D9B3] text-gray-900 border border-[#d1c4a0]'
                          : 'text-gray-700 hover:bg-gray-50'
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
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="input search text"
                    className="flex-1 pl-12 pr-0 py-3 border-0 rounded-l-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
                    style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem' }}
                  />

                  {/* Search Button - Darker Glamour Girls Colors */}
                  <button
                    type="submit"
                    disabled={!canSearch}
                    className="px-6 py-3 rounded-r-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#6f5718] active:scale-95 active:shadow-md active:opacity-90"
                    style={{
                      backgroundColor: canSearch ? '#8b6f2a' : '#6f5718',
                      color: '#ffffff',
                      borderLeft: '1px solid #6f5718',
                    }}
                    onMouseEnter={(e) => {
                      if (canSearch) {
                        e.currentTarget.style.backgroundColor = '#6f5718';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canSearch) {
                        e.currentTarget.style.backgroundColor = '#8b6f2a';
                      }
                    }}
                  >
                    Search
                  </button>
                </div>

                {/* Helper text */}
                <p className="text-xs text-[var(--text-muted)] mt-2 ml-1" style={{ fontFamily: 'var(--font-ui)' }}>
                  {canSearch ? (
                    <>
                      Press <kbd className="px-1.5 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[10px]">Enter</kbd> or click Search to find results
                    </>
                  ) : (
                    <>Enter at least 3 characters or select a year to search</>
                  )}
                </p>
              </div>
            </form>

            {/* Stats Section */}
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
