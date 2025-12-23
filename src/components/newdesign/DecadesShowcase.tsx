'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Actress {
  id: string;
  name: string;
  decade: string;
  imageUrl: string;
  slug?: string;
}

interface DecadesShowcaseProps {
  actresses: Actress[];
  columns?: number;
}

export default function DecadesShowcase({ actresses, columns = 2 }: DecadesShowcaseProps) {
  if (!Array.isArray(actresses) || actresses.length === 0) {
    return null;
  }

  const items = actresses;
  const gridClass = columns === 4 ? 'grid-cols-4' : 'grid-cols-2';

  return (
    <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)]">Decades</p>
        <h3
          className="text-[var(--text-primary)]"
          style={{
            fontFamily: 'var(--font-headline)',
            fontSize: 'var(--h2-size)',
            letterSpacing: 'var(--h2-letter-spacing)',
            whiteSpace: 'nowrap',
          }}
        >
          Era highlights
        </h3>
        <p style={{ marginBottom: '10px' }}></p>

        <div className={`grid ${gridClass} gap-4`}>
          {items.map((actress) => {
            const href = actress.slug ? `/actress/${actress.id}/${actress.slug}` : `/actress/${actress.id}`;
            return (
              <Link key={actress.id} href={href} className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-[32px] bg-[var(--bg-page)]">
                  <Image
                    src={actress.imageUrl}
                    alt={actress.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 45vw, 12vw"
                  />
                </div>
                <div className="mt-3">
                  <p
                    className="text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent-gold)] transition-colors uppercase font-bold"
                    style={{ fontFamily: "'Kabel Black', sans-serif", fontSize: '1.125rem' }}
                  >
                    {actress.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">{actress.decade}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
