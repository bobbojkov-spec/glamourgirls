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

interface FeaturedActressesGridProps {
  actresses?: Actress[];
  title?: string;
  eyebrow?: string;
  description?: string;
  columns?: number;
}

export default function FeaturedActressesGrid({
  actresses = [],
  title = 'Featured Actresses',
  eyebrow,
  description,
  columns = 2,
}: FeaturedActressesGridProps) {
  if (!Array.isArray(actresses) || actresses.length === 0) {
    return null;
  }

  const gridClass =
    columns === 3 ? 'grid-cols-3' : columns === 4 ? 'grid-cols-4' : 'grid-cols-2';

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-2">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h2
            className="text-[var(--text-primary)]"
            style={{
              fontFamily: 'var(--font-headline)',
              fontSize: 'var(--h2-size)',
              letterSpacing: 'var(--h2-letter-spacing)',
              lineHeight: 'var(--h2-line-height)',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h2>
          <p style={{ marginBottom: '10px' }}></p>
          {description && (
            <p className="text-[var(--text-secondary)] mt-2 text-base leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className={`grid ${gridClass} gap-5`}>
        {actresses.map((actress) => {
          const href = actress.slug ? `/actress/${actress.id}/${actress.slug}` : `/actress/${actress.id}`;
          return (
            <Link
              key={actress.id}
              href={href}
              className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] overflow-hidden hover:border-[var(--accent-gold)] transition-colors"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/25 pointer-events-none z-10" />
                <Image
                  src={actress.imageUrl}
                  alt={actress.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw"
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
                  {actress.decade}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
