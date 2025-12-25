'use client';

import React from 'react';
import { useFavorites } from '@/context/FavoritesContext';
import ActressListRow from '@/components/ui/ActressListRow';

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
          className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)] max-w-2xl w-full max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-5 mb-6 border-b border-[var(--border-subtle)] pb-5">
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
              className="interactive-icon text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-md hover:bg-[var(--state-hover-wash)]"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-[var(--text-secondary)] mb-2 font-medium" style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--body-size)' }}>
                No favorites yet.
              </p>
              <p className="text-sm text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-ui)' }}>
                Browse actresses and add them to your favorites
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6">
              <ul className="space-y-3">
                {favorites.map((actress) => (
                  <li key={actress.id}>
                    <ActressListRow
                      id={actress.id}
                      name={actress.name}
                      slug={actress.slug}
                      thumbnailUrl={actress.thumbnailUrl}
                      onClick={() => {
                        closeFavorites();
                      }}
                      actionButton={
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeFavorite(actress.id);
                          }}
                          className="interactive-icon flex-shrink-0 text-[var(--text-muted)] hover:text-red-500 p-2"
                          aria-label={`Remove ${actress.name} from favorites`}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      }
                    />
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

