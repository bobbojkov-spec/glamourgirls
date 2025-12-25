'use client';

import Link from 'next/link';

interface RelatedActress {
  id: number;
  name: string;
  slug: string;
  era?: string;
}

interface RelatedActressesGridProps {
  actresses: RelatedActress[];
}

export default function RelatedActressesGrid({ actresses }: RelatedActressesGridProps) {
  if (actresses.length === 0) {
    return null;
  }

  return (
    <div className="mt-[15px]">
      {/* Header - matching "Latest additions" style */}
      <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-2">Related actresses</p>
      
      {/* Vertical list - no limit */}
      <ul className="space-y-0">
        {actresses.map((related) => {
          const relatedImageUrl = `/api/actresses/${related.id}/headshot`;
          return (
            <li key={related.id}>
              <Link
                href={`/actress/${related.id}/${related.slug}`}
                className="flex items-center gap-3 py-3 px-2 rounded-lg border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)] transition-all duration-200 active:scale-[0.99] group"
              >
                {/* Small headshot on the left */}
                <div className="w-12 h-16 flex-shrink-0 bg-[var(--bg-surface-alt)] rounded overflow-hidden border border-[var(--border-subtle)]">
                  <img
                    src={relatedImageUrl}
                    alt={related.name}
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
                  {related.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

