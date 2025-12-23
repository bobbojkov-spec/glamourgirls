'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFavorites } from '@/context/FavoritesContext';

export default function FavoritesModal() {
  const { favorites, isOpen, closeFavorites, removeFavorite } = useFavorites();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
        onClick={closeFavorites}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)] p-6 max-w-2xl w-full max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-[var(--text-primary)]"
              style={{
                fontFamily: 'var(--font-headline)',
                fontSize: 'var(--h2-size)',
                letterSpacing: 'var(--h2-letter-spacing)',
                lineHeight: 'var(--h2-line-height)',
              }}
            >
              Favorites
            </h2>
            <button
              onClick={closeFavorites}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-secondary)]">No favorites yet.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2">
              <ul className="space-y-3">
                {favorites.map((actress) => (
                  <li key={actress.id}>
                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-surface-alt)] transition-colors group">
                      <Link
                        href={`/actress/${actress.id}/${actress.slug}`}
                        onClick={closeFavorites}
                        className="flex items-center gap-4 flex-1 min-w-0"
                      >
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-[var(--border-subtle)]">
                          <Image
                            src={actress.thumbnailUrl}
                            alt={actress.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <p
                          className="text-base text-[var(--text-primary)] leading-tight uppercase font-bold truncate flex-1"
                          style={{ fontFamily: "'Kabel Black', sans-serif" }}
                        >
                          {actress.name}
                        </p>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFavorite(actress.id);
                        }}
                        className="flex-shrink-0 p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                        aria-label={`Remove ${actress.name} from favorites`}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

