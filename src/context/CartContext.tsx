'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { getCookie, setCookie } from '@/lib/cookies';

export interface CartItem {
  id: string;
  actressId: string;
  actressName: string;
  actressSlug: string;
  thumbnailUrl: string;
  price: number;
  width: number;
  height: number;
  fileSizeMB?: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string | number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  totalPrice: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  itemCount: number;
  isInCart: (id: string | number) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_COOKIE_NAME = 'gg_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from cookie on mount
  useEffect(() => {
    try {
      const cookieData = getCookie(CART_COOKIE_NAME);
      if (cookieData) {
        const parsed = JSON.parse(cookieData);
        if (Array.isArray(parsed)) {
          // Normalize IDs to strings when loading from cookie
          // Handle backward compatibility: add actressSlug if missing (use actressId as fallback)
          const normalizedItems = parsed.map((item: any) => ({
            ...item,
            id: String(item.id).trim(),
            actressSlug: item.actressSlug || String(item.actressId || item.id),
          }));
          setItems(normalizedItems);
        }
      }
    } catch (error) {
      console.error('Error loading cart from cookie:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save cart to cookie whenever it changes (debounced to avoid excessive writes)
  useEffect(() => {
    if (isInitialized) {
      // Debounce cookie saves to avoid excessive writes
      const timeoutId = setTimeout(() => {
        try {
          setCookie(CART_COOKIE_NAME, JSON.stringify(items), 365);
        } catch (error) {
          console.error('Error saving cart to cookie:', error);
        }
      }, 300); // Wait 300ms after last change

      return () => clearTimeout(timeoutId);
    }
  }, [items, isInitialized]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Normalize ID to string and trim whitespace for consistent comparison
      const normalizedId = String(item.id).trim();
      const normalizedItem = { ...item, id: normalizedId };
      
      // Don't add duplicates - check if item with same ID already exists
      // Use strict comparison after normalizing both sides
      const existingIndex = prev.findIndex((i) => String(i.id).trim() === normalizedId);
      if (existingIndex !== -1) {
        // Item already exists, return previous state unchanged
        return prev;
      }
      return [...prev, normalizedItem];
    });
  }, []);

  const removeItem = useCallback((id: string | number) => {
    const normalizedId = String(id).trim();
    setItems((prev) => prev.filter((item) => String(item.id).trim() !== normalizedId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const isInCart = useCallback((id: string | number) => {
    const normalizedId = String(id).trim();
    return items.some((item) => String(item.id).trim() === normalizedId);
  }, [items]);

  // Calculate discount based on item count
  const calculateDiscount = useCallback((count: number): number => {
    if (count >= 10) return 0.20; // 20% discount for 10+ images
    if (count >= 5) return 0.10; // 10% discount for 5+ images
    return 0; // No discount
  }, []);

  // Memoize calculations to avoid recalculating on every render
  const { subtotal, discountRate, discountAmount, totalPrice, itemCount } = useMemo(() => {
    const sub = items.reduce((sum, item) => sum + item.price, 0);
    const rate = calculateDiscount(items.length);
    const discount = sub * rate;
    const total = sub - discount;
    return {
      subtotal: sub,
      discountRate: rate,
      discountAmount: discount,
      totalPrice: total,
      itemCount: items.length,
    };
  }, [items, calculateDiscount]);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        addItem,
        removeItem,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
        totalPrice,
        subtotal,
        discountRate,
        discountAmount,
        itemCount,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}



