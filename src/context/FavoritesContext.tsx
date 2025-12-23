'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getCookie, setCookie } from '@/lib/cookies';

export interface FavoriteActress {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string;
}

interface FavoritesContextType {
  favorites: FavoriteActress[];
  isOpen: boolean;
  addFavorite: (actress: FavoriteActress) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  openFavorites: () => void;
  closeFavorites: () => void;
  toggleFavorites: () => void;
  favoriteCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_COOKIE_NAME = 'gg_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteActress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load favorites from cookie on mount
  useEffect(() => {
    try {
      const cookieData = getCookie(FAVORITES_COOKIE_NAME);
      if (cookieData) {
        const parsed = JSON.parse(cookieData);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading favorites from cookie:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save favorites to cookie whenever they change
  useEffect(() => {
    if (isInitialized) {
      try {
        setCookie(FAVORITES_COOKIE_NAME, JSON.stringify(favorites), 365);
      } catch (error) {
        console.error('Error saving favorites to cookie:', error);
      }
    }
  }, [favorites, isInitialized]);

  const addFavorite = useCallback((actress: FavoriteActress) => {
    setFavorites((prev) => {
      // Don't add duplicates
      if (prev.some((f) => f.id === actress.id)) {
        return prev;
      }
      return [...prev, actress];
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favorites.some((f) => f.id === id);
  }, [favorites]);

  const openFavorites = useCallback(() => setIsOpen(true), []);
  const closeFavorites = useCallback(() => setIsOpen(false), []);
  const toggleFavorites = useCallback(() => setIsOpen((prev) => !prev), []);

  const favoriteCount = favorites.length;

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isOpen,
        addFavorite,
        removeFavorite,
        isFavorite,
        openFavorites,
        closeFavorites,
        toggleFavorites,
        favoriteCount,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

