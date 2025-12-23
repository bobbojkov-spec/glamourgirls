'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface RelatedActress {
  id: number;
  name: string;
  slug: string;
}

interface RelatedActressesGridProps {
  actresses: RelatedActress[];
}

export default function RelatedActressesGrid({ actresses }: RelatedActressesGridProps) {
  const [columns, setColumns] = useState(4);
  const [visibleCount, setVisibleCount] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkSize = () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const minHeight = 120; // Minimum height in pixels
      const aspectRatio = 3 / 4; // Portrait aspect ratio
      
      // Gap sizes: gap-3 = 12px (0.75rem), gap-4 = 16px (1rem)
      // On mobile (gap-3), on desktop (gap-4)
      const isMobile = containerWidth < 768;
      const gapSize = isMobile ? 12 : 16;

      // Calculate how many columns we can fit while maintaining min height
      let bestColumns = 4;
      let bestVisible = 4;

      // Try 4 columns
      const width4 = (containerWidth - 3 * gapSize) / 4;
      const height4 = width4 / aspectRatio;
      if (height4 >= minHeight) {
        bestColumns = 4;
        bestVisible = Math.min(4, actresses.length);
      } else {
        // Try 3 columns
        const width3 = (containerWidth - 2 * gapSize) / 3;
        const height3 = width3 / aspectRatio;
        if (height3 >= minHeight) {
          bestColumns = 3;
          bestVisible = Math.min(3, actresses.length);
        } else {
          // Use 2 columns
          bestColumns = 2;
          const width2 = (containerWidth - 1 * gapSize) / 2;
          const height2 = width2 / aspectRatio;
          if (height2 >= minHeight) {
            bestVisible = Math.min(2, actresses.length);
          } else {
            // Even 2 columns is too small, but we'll show 2 anyway as minimum
            bestVisible = Math.min(2, actresses.length);
          }
        }
      }

      setColumns(bestColumns);
      setVisibleCount(bestVisible);
    };

    // Use ResizeObserver for more accurate size detection
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      checkSize();
    });

    resizeObserver.observe(containerRef.current);
    checkSize(); // Initial check

    return () => {
      resizeObserver.disconnect();
    };
  }, [actresses.length]);

  const visibleActresses = actresses.slice(0, visibleCount);
  const gridColsClass = columns === 4 ? 'grid-cols-4' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div ref={containerRef} className="mt-[15px]">
      <div className={`grid ${gridColsClass} gap-3 md:gap-4`}>
        {visibleActresses.map((related, index) => {
          const relatedImageUrl = `/api/actresses/${related.id}/headshot`;
          return (
            <Link
              key={related.id}
              href={`/actress/${related.id}/${related.slug}`}
              className="group relative"
            >
              <div
                ref={index === 0 ? itemRef : null}
                className="relative aspect-[3/4] overflow-hidden border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-surface-alt)]"
                style={{ minHeight: '120px' }}
              >
                <img
                  src={relatedImageUrl}
                  alt={related.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Hover overlay with actress name - similar to era grid */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none z-10">
                  <p className="text-white text-sm font-bold text-center px-2 leading-tight uppercase" style={{ fontFamily: "'Kabel Black', sans-serif" }}>
                    {related.name}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

