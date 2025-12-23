'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LatestActress {
  id: string;
  name: string;
  slug?: string;
  era?: string;
  imageUrl?: string;
}

interface LatestAdditionsProps {
  actresses?: LatestActress[];
  variant?: 'grid' | 'list';
  layout?: 'section' | 'card';
  columns?: number;
}

export default function LatestAdditions({
  actresses = [],
  variant = 'grid',
  layout = 'section',
  columns = 2,
}: LatestAdditionsProps) {
  if (actresses.length === 0) {
    return null;
  }

  const gridClass =
    columns === 3 ? 'grid-cols-3' : columns === 4 ? 'grid-cols-4' : 'grid-cols-2';

  const content = (
    <div
      className={`${
        layout === 'card'
          ? 'bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6'
          : ''
      }`}
    >
      <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-2">Latest additions</p>
      <h2
        className="text-[var(--text-primary)]"
        style={{
          fontFamily: 'var(--font-headline)',
          fontSize: 'var(--h2-size)',
          lineHeight: 'var(--h2-line-height)',
          letterSpacing: 'var(--h2-letter-spacing)',
        }}
      >
        New pictures
      </h2>
      <p style={{ marginBottom: '10px' }}></p>

      {variant === 'grid' ? (
        <div className={`grid ${gridClass} gap-5`}>
          {actresses.map((actress) => {
            const href = actress.slug ? `/actress/${actress.id}/${actress.slug}` : `/actress/${actress.id}`;
            return (
              <Link key={actress.id} href={href} className="group">
                <div className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-page)]">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={actress.imageUrl || '/placeholder-portrait.svg'}
                      alt={actress.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  </div>
                  <div className="p-4">
                  <p
                    className="text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent-gold)] transition-colors uppercase font-bold"
                    style={{ fontFamily: "'Kabel Black', sans-serif", fontSize: '1.125rem' }}
                  >
                    {actress.name}
                  </p>
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-muted)] mt-1">
                      {actress.era || 'Classic Era'}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-4">
          {actresses.map((actress) => {
            const href = actress.slug ? `/actress/${actress.id}/${actress.slug}` : `/actress/${actress.id}`;
            return (
              <li key={actress.id}>
                <Link href={href} className="flex items-center gap-4 group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-3">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-page-alt)]">
                    <Image
                      src={actress.imageUrl || '/placeholder-portrait.svg'}
                      alt={actress.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                  <div>
                    <p
                      className="text-[var(--text-primary)] leading-tight group-hover:text-[var(--accent-gold)] transition-colors uppercase font-bold"
                      style={{ fontFamily: "'Kabel Black', sans-serif", fontSize: '1.125rem' }}
                    >
                      {actress.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-muted)] mt-1">
                      {actress.era || 'Classic Era'}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (layout === 'section') {
    return (
      <section className="bg-[var(--bg-page)] py-12 md:py-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto">{content}</div>
      </section>
    );
  }

  return content;
}
