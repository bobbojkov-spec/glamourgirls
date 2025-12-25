'use client';

import React from 'react';
import { useFavorites } from '@/context/FavoritesContext';

interface FavoriteButtonProps {
  actressId: string;
  actressName: string;
  actressSlug: string;
  thumbnailUrl: string;
}

export default function FavoriteButton({
  actressId,
  actressName,
  actressSlug,
  thumbnailUrl,
}: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorited = isFavorite(actressId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (favorited) {
      removeFavorite(actressId);
    } else {
      addFavorite({
        id: actressId,
        name: actressName,
        slug: actressSlug,
        thumbnailUrl,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="interactive-button flex items-center justify-center w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg border-2 border-[var(--border-subtle)] hover:border-[var(--accent-gold)]"
      aria-label={favorited ? `Remove ${actressName} from favorites` : `Add ${actressName} to favorites`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={favorited ? '#8B4513' : 'none'}
        stroke={favorited ? '#8B4513' : 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-200"
        style={{ 
          color: favorited ? '#8B4513' : 'var(--text-secondary)',
        }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}

