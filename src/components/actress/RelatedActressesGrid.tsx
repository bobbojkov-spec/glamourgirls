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
      <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-muted)] mb-4">Related actresses</p>
      
      {/* Editorial list - wider, calm blocks */}
      <ul className="space-y-2">
        {actresses.map((related) => {
          const relatedImageUrl = `/api/actresses/${related.id}/headshot`;
          return (
            <li key={related.id}>
              <Link
                href={`/actress/${related.id}/${related.slug}`}
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
                    src={relatedImageUrl}
                    alt={related.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.opacity = '0.6'; // Muted placeholder
                    }}
                  />
                </div>
                
                {/* Name - editorial typography */}
                <span
                  className="flex-1 group-hover:text-[var(--accent-gold)] transition-colors"
                  style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontSize: 'clamp(1rem, 1.1vw, 1.125rem)', // 16px mobile, 18px desktop
                    fontWeight: 600, // SemiBold
                    color: 'var(--text-primary)',
                    lineHeight: '1.4',
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

