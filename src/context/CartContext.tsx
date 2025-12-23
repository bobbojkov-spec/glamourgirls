'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getCookie, setCookie } from '@/lib/cookies';

export interface CartItem {
  id: string;
  actressId: string;
  actressName: string;
  thumbnailUrl: string;
  price: number;
  width: number;
  height: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  totalPrice: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  itemCount: number;
  isInCart: (id: string) => boolean;
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
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading cart from cookie:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save cart to cookie whenever it changes
  useEffect(() => {
    if (isInitialized) {
      try {
        setCookie(CART_COOKIE_NAME, JSON.stringify(items), 365);
      } catch (error) {
        console.error('Error saving cart to cookie:', error);
      }
    }
  }, [items, isInitialized]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Don't add duplicates
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const isInCart = useCallback((id: string) => {
    return items.some((item) => item.id === id);
  }, [items]);

  // Calculate discount based on item count
  const calculateDiscount = (count: number): number => {
    if (count >= 10) return 0.20; // 20% discount for 10+ images
    if (count >= 5) return 0.10; // 10% discount for 5+ images
    return 0; // No discount
  };

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const discountRate = calculateDiscount(items.length);
  const discountAmount = subtotal * discountRate;
  const totalPrice = subtotal - discountAmount;
  const itemCount = items.length;

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



