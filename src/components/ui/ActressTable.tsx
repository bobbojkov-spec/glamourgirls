'use client';

import Link from 'next/link';
import EraBadge from './EraBadge';
import ActressListRow from './ActressListRow';

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
      <table className="results-table hidden md:table w-full" style={{ fontFamily: 'var(--font-ui)' }}>
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
            <tr key={actress.id} className="interactive-row border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)]">
              <td className="py-3">
                <Link 
                  href={actress.slug ? `/actress/${actress.id}/${actress.slug}` : `/actress/${actress.id}`}
                  className="flex items-center gap-4 interactive-link"
                >
                  {/* Thumbnail - Match ActressListRow exactly */}
                  <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
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
                  {/* Name - Match ActressListRow exactly */}
                  <span 
                    className="text-base text-[var(--text-primary)] leading-tight uppercase font-bold truncate" 
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
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--meta-size)',
                  fontWeight: 400,
                }}
              >
                {actress.years}
              </td>
              <td 
                className="py-3 text-center text-[var(--text-secondary)]" 
                style={{ 
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--meta-size)',
                  fontWeight: 400,
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
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--meta-size)',
                  fontWeight: 400,
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
          <ActressListRow
            key={actress.id}
            id={actress.id}
            name={actress.name}
            slug={actress.slug}
            thumbnailUrl={`/api/actresses/${actress.id}/headshot`}
            theirMan={actress.theirMan}
            additionalContent={
              <div 
                className="text-[var(--text-secondary)]" 
                style={{ 
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--meta-size)',
                  fontWeight: 400,
                }}
              >
                {actress.years} • {actress.photoCount} photos
                {actress.hqPhotoCount > 0 && ` • ${actress.hqPhotoCount} HQ`}
              </div>
            }
          />
        ))}
      </div>
    </div>
  );
}

