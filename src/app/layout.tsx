import type { Metadata } from "next";
import { CartDrawer } from "@/components/cart";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ContactModalProvider } from "@/context/ContactModalContext";
import ContactModalWrapper from "@/components/common/ContactModalWrapper";
import SearchIndexPreloaderWrapper from "@/components/common/SearchIndexPreloaderWrapper";
import SearchMetadataPreloaderWrapper from "@/components/common/SearchMetadataPreloaderWrapper";
import "./globals.css";
import { headers } from "next/headers";
import { inter, sourceSans, dmSans, montserrat } from "./fonts";

export const metadata: Metadata = {
  title: "Glamour Girls of the Silver Screen",
  description: "Dedicated to the private lives of some of the most glamorous actresses of the Thirties, Forties, Fifties, and Sixties.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isAdmin = false;
  let isNewDesign = false;
  let isActress = false;
  let isExplore = false;
  let isCheckout = false;
  let isDownload = false;
  let isSearch = false;
  let isFront2 = false;
  let isCart = false;
  try {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "";
    isAdmin = pathname.startsWith("/admin");
    isNewDesign = pathname.startsWith("/newdesign") || pathname === "/old";
    isActress = pathname.startsWith("/actress");
    isExplore = pathname.startsWith("/explore");
    isCheckout = pathname.startsWith("/checkout");
    isDownload = pathname.startsWith("/download");
    isSearch = pathname.startsWith("/search");
    isFront2 = pathname.startsWith("/front2") || pathname === "/";
    isCart = pathname.startsWith("/cart");
  } catch (e) {
    // If headers() fails, assume not admin or newdesign
    isAdmin = false;
    isNewDesign = false;
    isActress = false;
    isExplore = false;
    isCheckout = false;
    isDownload = false;
    isSearch = false;
    isFront2 = false;
    isCart = false;
  }

  // Admin pages use their own layout and CSS (no website header/sidebar)
  if (isAdmin) {
    return (
      <html lang="en" className={montserrat.variable}>
        <head>
          {/* Montserrat font loaded via next/font - no <link> tags needed */}
        </head>
        <body className="antialiased bg-gray-50">
          {children}
        </body>
      </html>
    );
  }

  // New design pages, actress pages, explore page, checkout, download, search, cart, and front2 pages use their own layout (completely separate)
  if (isNewDesign || isActress || isExplore || isCheckout || isDownload || isSearch || isFront2 || isCart) {
    return (
      <html 
        lang="en" 
        className={`new-design ${inter.variable} ${sourceSans.variable}`}
      >
        <head>
          {/* Preload critical decorative fonts only */}
          <link
            rel="preload"
            href="/fonts/dubba-dubba-nf/DubbaDubbaNF.otf"
            as="font"
            type="font/otf"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/Kabel Black Regular/Kabel Black Regular.otf"
            as="font"
            type="font/otf"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/Broadway.ttf"
            as="font"
            type="font/ttf"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/didot-2/Didot Bold.otf"
            as="font"
            type="font/otf"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/lemonmilk-cufonfonts/LemonMilk.otf"
            as="font"
            type="font/otf"
            crossOrigin="anonymous"
          />
          {/* Preconnect for Google Fonts (only for decorative fonts: Great Vibes, Alex Brush) */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* Display fonts (Great Vibes, Alex Brush) - decorative only */}
          <link
            href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Alex+Brush&display=optional"
            rel="stylesheet"
          />
          {/* UI fonts (Inter, Source Sans 3) loaded via next/font - no <link> tags needed */}
        </head>
        <body className="antialiased min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
          <CartProvider>
            <FavoritesProvider>
              <ContactModalProvider>
                <SearchIndexPreloaderWrapper />
                <SearchMetadataPreloaderWrapper />
                {children}
                {/* Cart Drawer - always available */}
                <CartDrawer />
                <ContactModalWrapper />
              </ContactModalProvider>
            </FavoritesProvider>
          </CartProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`}>
      <head>
        {/* Preconnect for Google Fonts (only for decorative fonts) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Vintage Typography Fonts (decorative only) - UI font (DM Sans) loaded via next/font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Playfair+Display+SC:ital,wght@0,400;0,700;0,900;1,400&family=Great+Vibes&family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Protest+Strike&display=optional" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          <FavoritesProvider>
            <ContactModalProvider>
              <SearchIndexPreloaderWrapper />
              <SearchMetadataPreloaderWrapper />
              {/* Main content - no old header */}
              <main className="flex-1 min-w-0">
                {children}
              </main>

              {/* Cart Drawer */}
              <CartDrawer />
              <ContactModalWrapper />
            </ContactModalProvider>
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
