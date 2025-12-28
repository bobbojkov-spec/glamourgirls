'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFavorites } from '@/context/FavoritesContext';
import ActressListRow from '@/components/ui/ActressListRow';
import ModalHeader from '@/components/ui/ModalHeader';

export default function FavoritesModal() {
  const { favorites, isOpen, closeFavorites, removeFavorite } = useFavorites();
  const pathname = usePathname();

  // Close favorites panel automatically when route changes (navigation happened)
  // This ensures the panel closes as a side effect of navigation, not blocking it
  useEffect(() => {
    if (isOpen) {
      closeFavorites();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <ModalHeader 
            title="Favorites" 
            onClose={closeFavorites}
            closeAriaLabel="Close favorites"
          />

          {favorites.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center">
                <p 
                  className="text-[var(--text-secondary)] mb-2 font-medium" 
                  style={{ 
                    fontFamily: 'var(--font-ui)', 
                    fontSize: 'var(--body-size)',
                    lineHeight: 'var(--body-line-height)',
                  }}
                >
                  No favorites yet.
                </p>
                <p 
                  className="text-[var(--text-muted)]" 
                  style={{ 
                    fontFamily: 'var(--font-ui)',
                    fontSize: 'var(--meta-size)',
                    lineHeight: 'var(--meta-line-height)',
                  }}
                >
                  Browse actresses and add them to your favorites
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-3">
                {favorites.map((actress) => (
                  <li key={actress.id}>
                    <ActressListRow
                      id={actress.id}
                      name={actress.name}
                      slug={actress.slug}
                      thumbnailUrl={actress.thumbnailUrl}
                      // No onClick prop - uses default Link navigation for instant routing
                      // Panel closes automatically via useEffect when pathname changes
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

