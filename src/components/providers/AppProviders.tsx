'use client';

import { ReactNode } from 'react';
import { CartProvider } from '@/context/CartContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ContactModalProvider } from '@/context/ContactModalContext';
import SearchIndexPreloaderWrapper from '@/components/common/SearchIndexPreloaderWrapper';
import SearchMetadataPreloaderWrapper from '@/components/common/SearchMetadataPreloaderWrapper';
import ContactModalWrapper from '@/components/common/ContactModalWrapper';
import { CartDrawer } from '@/components/cart';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <FavoritesProvider>
        <ContactModalProvider>
          <SearchIndexPreloaderWrapper />
          <SearchMetadataPreloaderWrapper />
          {children}
          <CartDrawer />
          <ContactModalWrapper />
        </ContactModalProvider>
      </FavoritesProvider>
    </CartProvider>
  );
}

