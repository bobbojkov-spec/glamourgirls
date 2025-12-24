'use client';

import Link from 'next/link';
import EraBadge from './EraBadge';

export interface ActressRow {
  id: string;
  name: string;
  slug?: string;
  years: string;
  photoCount: number;
  hqPhotoCount: number;
  isNew?: boolean;
  hasNewPhotos?: boolean;
  theirMan?: boolean; // Flag for "their men" category
}

interface ActressTableProps {
  actresses: ActressRow[];
  /** Sort by name or surname */
  sortBy?: 'name' | 'surname';
  onSortChange?: (sort: 'name' | 'surname') => void;
}

export default function ActressTable({ 
  actresses, 
  sortBy = 'surname',
  onSortChange 
}: ActressTableProps) {
  return (
    <div className="overflow-x-auto">
      {/* Desktop Table */}
      <table className="results-table hidden md:table w-full" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="pb-3 text-left" style={{ 
              fontFamily: 'DM Sans, sans-serif', 
              fontSize: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#3F3F3F',
              fontWeight: 'bold',
              backgroundColor: '#D9CCA3',
              padding: '0.6rem 0.8rem'
            }}>NAMES</th>
            <th className="w-[100px] pb-3 text-left" style={{ 
              fontFamily: 'DM Sans, sans-serif', 
              fontSize: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#3F3F3F',
              fontWeight: 'bold',
              backgroundColor: '#D9CCA3',
              padding: '0.6rem 0.8rem'
            }}>YEARS</th>
            <th className="w-[80px] text-center pb-3" style={{ 
              fontFamily: 'DM Sans, sans-serif', 
              fontSize: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#3F3F3F',
              fontWeight: 'bold',
              backgroundColor: '#D9CCA3',
              padding: '0.6rem 0.8rem'
            }}>PHOTOS</th>
            <th className="w-[120px] text-center pb-3 whitespace-nowrap" style={{ 
              fontFamily: 'DM Sans, sans-serif', 
              fontSize: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#3F3F3F',
              fontWeight: 'bold',
              backgroundColor: '#D9CCA3',
              padding: '0.6rem 0.8rem'
            }}>HQ PHOTOS</th>
          </tr>
        </thead>
        <tbody>
          {actresses.map((actress) => (
            <tr key={actress.id} className="hover:bg-[var(--bg-surface-alt)] transition-colors border-b border-[var(--border-subtle)]">
              <td className="py-3">
                <Link 
                  href={actress.slug ? `/actress/${actress.id}/${actress.slug}` : `/actress/${actress.id}`}
                  className="flex items-center gap-3 hover:text-[var(--accent-gold)] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-16 flex-shrink-0 bg-[var(--bg-surface-alt)] rounded overflow-hidden border border-[var(--border-subtle)]">
                    <img
                      src={`/api/actresses/${actress.id}/headshot`}
                      alt={actress.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Only use placeholder for "their men" entries when image fails
                        const img = e.currentTarget;
                        if (actress.theirMan && !img.src.includes('placeholder')) {
                          img.src = '/images/placeholder-man-portrait.png';
                        } else {
                          // Hide broken image for regular entries
                          img.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                  {/* Name */}
                  <span 
                    className="uppercase search-actress-name" 
                    style={{ 
                      fontFamily: "'Kabel Black', sans-serif",
                    }}
                  >
                    {actress.name}
                  </span>
                </Link>
              </td>
              <td 
                className="py-3 text-[var(--text-secondary)]" 
                style={{ 
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px', /* 13-14px range */
                  fontWeight: 400,
                  opacity: 0.7, /* Lower contrast than names */
                }}
              >
                {actress.years}
              </td>
              <td 
                className="py-3 text-center text-[var(--text-secondary)]" 
                style={{ 
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px', /* 13-14px range */
                  fontWeight: 400,
                  opacity: 0.7, /* Lower contrast than names */
                }}
              >
                {actress.hasNewPhotos && (
                  <span className="inline-block w-4 h-4 mr-1">📷</span>
                )}
                {actress.photoCount > 0 ? actress.photoCount : '-'}
              </td>
              <td 
                className="py-3 text-center text-[var(--text-secondary)]" 
                style={{ 
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px', /* 13-14px range */
                  fontWeight: 400,
                  opacity: 0.7, /* Lower contrast than names */
                }}
              >
                {actress.hqPhotoCount > 0 ? actress.hqPhotoCount : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {actresses.map((actress) => (
          <Link 
            key={actress.id}
            href={actress.slug ? `/actress/${actress.id}/${actress.slug}` : `/actress/${actress.id}`}
            className="block bg-[var(--bg-surface-alt)] p-4 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Thumbnail */}
              <div className="w-16 h-20 flex-shrink-0 bg-[var(--bg-surface)] rounded overflow-hidden border border-[var(--border-subtle)]">
                <img
                  src={`/api/actresses/${actress.id}/headshot`}
                  alt={actress.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // Only use placeholder for "their men" entries when image fails
                    const img = e.currentTarget;
                    if (actress.theirMan && !img.src.includes('placeholder')) {
                      img.src = '/images/placeholder-man-portrait.png';
                    } else {
                      // Hide broken image for regular entries
                      img.style.display = 'none';
                    }
                  }}
                />
              </div>
              {/* Details */}
              <div className="flex-1 min-w-0">
                {actress.isNew && (
                  <span className="badge-new mr-2">NEW</span>
                )}
                <div 
                  className="mb-1 uppercase search-actress-name" 
                  style={{ 
                    fontFamily: "'Kabel Black', sans-serif",
                  }}
                >
                  {actress.name}
                </div>
                <div 
                  className="text-[var(--text-secondary)]" 
                  style={{ 
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: 400,
                    opacity: 0.7,
                  }}
                >
                  {actress.years} • {actress.photoCount} photos
                  {actress.hqPhotoCount > 0 && ` • ${actress.hqPhotoCount} HQ`}
                </div>
              </div>
              <span className="text-[var(--text-muted)]">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

