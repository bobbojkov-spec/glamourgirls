'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DecadeChipProps {
  decade: string;
  isActive: boolean;
  onClick: () => void;
}

function DecadeChip({ decade, isActive, onClick }: DecadeChipProps) {
  // Split decade into year and 's'
  const year = decade.slice(0, -1); // e.g., "1920"
  const suffix = decade.slice(-1); // e.g., "s"
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-[10px] font-medium tracking-wide uppercase text-[var(--text-primary)] transition-all duration-300 relative overflow-hidden group flex-1 min-w-0"
      style={{
        backgroundColor: isActive ? '#fff5e1' : '#fef9eb',
        border: isActive ? '1px solid #8b6f2a' : '1px solid #6f5718',
        boxShadow: isActive 
          ? '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)' 
          : '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        fontFamily: "'Kabel Black', sans-serif",
        transform: isActive ? 'translateY(-3px) scale(1.02)' : 'translateY(0) scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.backgroundColor = '#fff5e1';
          e.currentTarget.style.borderColor = '#8b6f2a';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)';
          e.currentTarget.style.backgroundColor = '#fef9eb';
          e.currentTarget.style.borderColor = '#6f5718';
        }
      }}
    >
      <span className="relative z-10 whitespace-nowrap">
        <span style={{ fontSize: '11px' }}>{year}</span>
        <span style={{ fontSize: '8px', fontVariant: 'small-caps' }}>{suffix}</span>
      </span>
      <div 
        className="absolute inset-0 bg-gradient-to-r from-[#1890ff]/20 via-[#1890ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
    </button>
  );
}

export default function ActressFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDecade, setActiveDecade] = useState<string | null>(null);
  const router = useRouter();

  const decades = ['1920s', '1930s', '1940s', '1950s', '1960s'];

  // Map decade to era value used in search
  const getEraFromDecade = (decade: string): string => {
    const eraMap: Record<string, string> = {
      '1920s': '20-30s',
      '1930s': '20-30s',
      '1940s': '40s',
      '1950s': '50s',
      '1960s': '60s',
    };
    return eraMap[decade] || '50s';
  };

  const handleDecadeClick = (decade: string) => {
    const era = getEraFromDecade(decade);
    // Navigate to search page with era filter
    router.push(`/search?era=${era}`);
  };

  return (
    <section className="bg-[var(--bg-page)]">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-3">
          Search actresses
        </p>
        <h2
          className="text-[var(--text-primary)] mb-[var(--heading-gap)]"
          style={{ fontFamily: 'var(--font-headline)', fontSize: 'var(--h2-size)', letterSpacing: 'var(--h2-letter-spacing)' }}
        >
          Explore legends
        </h2>
        <p style={{ marginBottom: '10px' }}></p>

        <div className="flex flex-col gap-4">
          <div className="relative flex items-center rounded-lg overflow-hidden border border-gray-300">
            {/* Magnifying Glass Icon on Left */}
            <div className="absolute left-4 z-10 pointer-events-none">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchQuery.trim()) {
                    window.location.href = `/search?keyword=${encodeURIComponent(searchQuery)}`;
                  }
                }
              }}
              placeholder="input search text"
              className="flex-1 pl-12 pr-0 py-3 border-0 rounded-l-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            
            {/* Search Button - Darker Glamour Girls Colors */}
            <button
              onClick={() => {
                if (searchQuery.trim()) {
                  window.location.href = `/search?keyword=${encodeURIComponent(searchQuery)}`;
                }
              }}
              disabled={!searchQuery.trim()}
              className="px-6 py-3 rounded-r-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: searchQuery.trim() ? '#8b6f2a' : '#6f5718',
                color: '#ffffff',
                borderLeft: '1px solid #6f5718',
              }}
              onMouseEnter={(e) => {
                if (searchQuery.trim()) {
                  e.currentTarget.style.backgroundColor = '#6f5718';
                }
              }}
              onMouseLeave={(e) => {
                if (searchQuery.trim()) {
                  e.currentTarget.style.backgroundColor = '#8b6f2a';
                }
              }}
            >
              Search
            </button>
          </div>

          <div className="flex gap-2 w-full">
            {decades.map((decade) => (
              <DecadeChip
                key={decade}
                decade={decade}
                isActive={activeDecade === decade}
                onClick={() => handleDecadeClick(decade)}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
