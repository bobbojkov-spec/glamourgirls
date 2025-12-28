import { Inter, Source_Sans_3, DM_Sans, Montserrat } from 'next/font/google';

/**
 * UI / Body Fonts - Optimized with Next.js Font Optimization
 * These fonts are self-hosted and optimized for zero layout shift
 */

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
  preload: true,
});

export const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  preload: true,
});

export const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'optional', // Use optional for admin to prevent blocking - fallback to system font if not ready
  variable: '--font-montserrat',
  preload: true,
  adjustFontFallback: true, // Better fallback metrics
});

