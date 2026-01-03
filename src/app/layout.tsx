import type { Metadata } from "next";
import Script from "next/script";
import AppProviders from "@/components/providers/AppProviders";
import "./globals.css";
import { headers } from "next/headers";
import {
  inter,
  sourceSans,
  dmSans,
  montserrat,
  greatVibes,
  alexBrush,
  cormorantGaramond,
  bebasNeue,
  protestStrike,
} from "./fonts";

export const metadata: Metadata = {
  title: "Glamour Girls of the Silver Screen",
  description: "Dedicated to the private lives of some of the most glamorous actresses of the Thirties, Forties, Fifties, and Sixties.",
};

const vintageFontClasses = [
  cormorantGaramond.variable,
  protestStrike.variable,
  bebasNeue.variable,
  greatVibes.variable,
  alexBrush.variable,
].join(" ");

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
      <html lang="en" className={montserrat.variable} style={{ fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }}>
        <head>
          {/* Montserrat font loaded via next/font - no <link> tags needed */}
          {/* CSS is loaded synchronously via admin/layout.tsx */}
        </head>
        <body className="antialiased bg-gray-50" suppressHydrationWarning>
          {/* Google Analytics */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-002SCLRCQD"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-002SCLRCQD');
            `}
          </Script>
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
          className={`new-design ${inter.variable} ${sourceSans.variable} ${vintageFontClasses}`}
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
            href="/fonts/lemonmilk-cufonfonts/LemonMilk.otf"
            as="font"
            type="font/otf"
            crossOrigin="anonymous"
          />
        </head>
        <body className="antialiased min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
          {/* Google Analytics */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-002SCLRCQD"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-002SCLRCQD');
            `}
          </Script>
          <AppProviders>
            {children}
          </AppProviders>
        </body>
      </html>
    );
  }

    return (
      <html lang="en" className={`${dmSans.variable} ${inter.variable} ${vintageFontClasses}`}>
      <head>
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-002SCLRCQD"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-002SCLRCQD');
          `}
        </Script>
        <AppProviders>
          {/* Main content - no old header */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
