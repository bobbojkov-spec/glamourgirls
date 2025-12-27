'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface TheirMan {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  slug: string;
  description: string;
}

export default function TheirMen() {
  const [men, setMen] = useState<TheirMan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTheirMen() {
      try {
        const res = await fetch('/api/their-men');
        if (res.ok) {
          const data = await res.json();
          setMen(data);
        }
      } catch (error) {
        console.error('Error fetching their men:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTheirMen();
  }, []);

  if (isLoading) {
    return (
      <section className="bg-[var(--bg-page)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="bg-[var(--bg-surface)] rounded-2xl p-5 md:p-6" style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
          }}>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-4">Their Men</p>
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!men.length) return null;

  return (
    <section className="bg-[var(--bg-page)]">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="bg-[var(--bg-surface)] rounded-2xl p-5 md:p-6" style={{
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
        }}>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-4">Their Men</p>
          
          {/* Editorial list - wider, calm blocks */}
          <ul className="space-y-2">
            {men.map((man) => {
              const headshotUrl = `/api/actresses/${man.id}/headshot`;
              return (
                <li key={man.id}>
                  <Link
                    href={`/actress/${man.id}/${man.slug}`}
                    className="flex items-center gap-4 p-3 md:p-3.5 rounded-[11px] transition-colors duration-200 group"
                    style={{
                      backgroundColor: 'var(--bg-surface-alt)', // Soft block background
                      boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.04)', // Very subtle inner stroke
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface-alt)';
                    }}
                  >
                    {/* Larger square image */}
                    <div 
                      className="flex-shrink-0 bg-[var(--bg-surface-alt)] rounded-[9px] overflow-hidden"
                      style={{
                        width: 'clamp(52px, 4vw, 60px)',
                        height: 'clamp(52px, 4vw, 60px)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <img
                        src={headshotUrl}
                        alt={man.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.src.includes('placeholder')) {
                            img.src = '/images/placeholder-man-portrait.png';
                          }
                          img.style.opacity = '0.6'; // Muted placeholder
                        }}
                      />
                    </div>
                    
                    {/* Name - editorial typography */}
                    <span
                      className="flex-1 group-hover:text-[var(--accent-gold)] transition-colors"
                      style={{
                        fontFamily: "'Playfair Display', 'Didot', 'Times New Roman', serif",
                        fontSize: 'clamp(1rem, 1.1vw, 1.125rem)', // 16px mobile, 18px desktop
                        fontWeight: 600, // SemiBold
                        color: 'var(--text-primary)',
                        lineHeight: '1.4',
                      }}
                    >
                      {man.name}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
