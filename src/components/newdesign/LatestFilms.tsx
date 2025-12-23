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
          <h3
            className="text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: 'var(--h2-size)',
              lineHeight: 'var(--h2-line-height)',
              letterSpacing: 'var(--h2-letter-spacing)',
            }}
          >
            Behind the Scenes
          </h3>
          <p style={{ marginBottom: '10px' }}></p>
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
        <h3
          className="text-[var(--text-primary)]"
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: 'var(--h2-size)',
            lineHeight: 'var(--h2-line-height)',
            letterSpacing: 'var(--h2-letter-spacing)',
          }}
        >
          Behind the Scenes
        </h3>
        <p style={{ marginBottom: '10px' }}></p>
        <ul className="space-y-4">
          {men.map((man) => (
            <li key={man.id}>
              <Link
                href={`/actress/${man.id}/${man.slug}`}
                className="block border-b border-[var(--border-subtle)] pb-4 last:border-0 last:pb-0 hover:opacity-80 transition-opacity"
              >
                <p className="text-base text-[var(--text-primary)] leading-tight uppercase font-bold mb-1" style={{ fontFamily: "'Kabel Black', sans-serif" }}>
                  {man.name}
                </p>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  {man.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
