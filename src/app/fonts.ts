import { Inter, Source_Sans_3, DM_Sans, Montserrat, Great_Vibes, Alex_Brush, Cormorant_Garamond, Bebas_Neue, Protest_Strike } from 'next/font/google';

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

export const greatVibes = Great_Vibes({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-great-vibes',
  weight: ['400'],
  preload: true,
});

export const alexBrush = Alex_Brush({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alex-brush',
  weight: ['400'],
  preload: true,
});

export const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant-garamond',
  weight: ['400', '600', '700'],
  preload: true,
});

export const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bebas-neue',
  weight: ['400'],
  preload: true,
});

export const protestStrike = Protest_Strike({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-protest-strike',
  weight: ['400'],
  preload: true,
});

