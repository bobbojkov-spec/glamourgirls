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
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-2">Their Men</p>
          <div className="text-center py-4">
            <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!men.length) return null;

  return (
    <section className="bg-[var(--bg-page)]">
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-2">Their Men</p>
        
        {/* Vertical list - matching RelatedActressesGrid style */}
        <ul className="space-y-0 mt-[15px]">
          {men.map((man) => {
            const headshotUrl = `/api/actresses/${man.id}/headshot`;
            return (
              <li key={man.id}>
                <Link
                  href={`/actress/${man.id}/${man.slug}`}
                  className="flex items-center gap-3 py-3 px-2 rounded-lg border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)] transition-all duration-200 active:scale-[0.99] group"
                >
                  {/* Small headshot on the left */}
                  <div className="w-12 h-16 flex-shrink-0 bg-[var(--bg-surface-alt)] rounded overflow-hidden border border-[var(--border-subtle)]">
                    <img
                      src={headshotUrl}
                      alt={man.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Hide broken image
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Name on the right */}
                  <span
                    className="uppercase flex-1 group-hover:text-[var(--accent-gold)] transition-colors"
                    style={{
                      fontFamily: "'Kabel Black', sans-serif",
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
    </section>
  );
}
