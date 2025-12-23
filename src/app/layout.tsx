import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import { CartDrawer } from "@/components/cart";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import "./globals.css";
import { headers } from "next/headers";

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
  try {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "";
    isAdmin = pathname.startsWith("/admin");
    isNewDesign = pathname.startsWith("/newdesign") || pathname === "/";
    isActress = pathname.startsWith("/actress");
    isExplore = pathname.startsWith("/explore");
    isCheckout = pathname.startsWith("/checkout");
    isDownload = pathname.startsWith("/download");
    isSearch = pathname.startsWith("/search");
  } catch (e) {
    // If headers() fails, assume not admin or newdesign
    isAdmin = false;
    isNewDesign = false;
    isActress = false;
    isExplore = false;
    isCheckout = false;
    isDownload = false;
    isSearch = false;
  }

  // Admin pages use their own layout and CSS (no website header/sidebar)
  if (isAdmin) {
    return (
      <html lang="en">
        <head>
          {/* Preload Montserrat font to prevent FOUT */}
          <link
            rel="preload"
            href="/fonts/Montserrat/Montserrat-VariableFont_wght.ttf"
            as="font"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/Montserrat/Montserrat-Italic-VariableFont_wght.ttf"
            as="font"
            crossOrigin="anonymous"
          />
          {/* Preconnect for Outfit Google Font */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* Outfit font for admin UI - using block to prevent FOUT */}
          <link
            href="https://fonts.googleapis.com/css2?family=Outfit:wght@100;200;300;400;500;600;700;800;900&display=block"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased bg-gray-50">
          {children}
        </body>
      </html>
    );
  }

  // New design pages, actress pages, explore page, checkout, download, and search pages use their own layout (completely separate)
  if (isNewDesign || isActress || isExplore || isCheckout || isDownload || isSearch) {
    return (
      <html lang="en" className="new-design">
        <head>
          {/* Preload Dubba Dubba NF font to prevent FOUT */}
          <link
            rel="preload"
            href="/fonts/dubba-dubba-nf/DubbaDubbaNF.otf"
            as="font"
            crossOrigin="anonymous"
          />
          {/* Preload Kabel Black font to prevent FOUT */}
          <link
            rel="preload"
            href="/fonts/Kabel Black Regular/Kabel Black Regular.otf"
            as="font"
            crossOrigin="anonymous"
          />
          {/* Preconnect for faster font loading */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* New Design Fonts */}
          <link
            href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Alex+Brush&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;0,6..96,600;0,6..96,700;1,6..96,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Inter:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="antialiased min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
          <CartProvider>
            <FavoritesProvider>
              {children}
              {/* Cart Drawer for actress pages */}
              {isActress && <CartDrawer />}
            </FavoritesProvider>
          </CartProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        {/* Preconnect for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Vintage Typography Fonts + Base UI Font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Cinzel+Decorative:wght@400;700;900&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Playfair+Display+SC:ital,wght@0,400;0,700;0,900;1,400&family=Great+Vibes&family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Protest+Strike&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          <FavoritesProvider>
            {/* Header */}
            <Header />

            {/* Main content */}
            <main className="flex-1 min-w-0">
              {children}
            </main>

            {/* Cart Drawer */}
            <CartDrawer />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
