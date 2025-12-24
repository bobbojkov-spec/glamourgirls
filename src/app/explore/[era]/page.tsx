import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Header, Footer } from '@/components/newdesign';
import Image from 'next/image';
import EraGridGalleryOptimized from '@/components/grid/EraGridGalleryOptimized';
import VintageButton from '@/components/ui/VintageButton';
import fs from 'fs/promises';
import path from 'path';
import { headers } from 'next/headers';
import '../../newdesign/design-tokens.css';

/**
 * Find available collage versions for an era and randomly select one
 */
async function getRandomHeroCollage(era: string): Promise<string | null> {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'images');
    const availableVersions: number[] = [];

    // Check which versions (1-3) exist
    for (let v = 1; v <= 3; v++) {
      const filename = `hero-collage-${era}-v${v}.jpg`;
      const filePath = path.join(publicDir, filename);
      
      try {
        await fs.access(filePath);
        availableVersions.push(v);
      } catch {
        // File doesn't exist, skip
      }
    }

    // If no versions found, return null (will fallback to default)
    if (availableVersions.length === 0) {
      console.log(`No collage images found for era ${era}`);
      return null;
    }

    // Randomly select one of the available versions
    const randomVersion = availableVersions[Math.floor(Math.random() * availableVersions.length)];
    const heroImage = `/images/hero-collage-${era}-v${randomVersion}.jpg`;
    
    console.log(`Selected hero collage for ${era}: v${randomVersion} (${availableVersions.length} versions available)`);
    return heroImage;
  } catch (error) {
    console.error(`Error finding hero collage for ${era}:`, error);
    return null;
  }
}

const ERA_INFO = {
  '1930s': {
    title: '1930s Glamour Girls Gallery | Classic Hollywood Actresses',
    description: 'Explore our collection of glamour girls from the 1930s era. Browse beautiful photos of classic Hollywood actresses from the golden age of cinema.',
    heroTitle: '1930s Gallery',
    intro: 'Step back in time to the glamorous 1930s, an era that defined classic Hollywood elegance. This gallery showcases the stunning actresses who graced the silver screen during this golden decade, capturing the essence of vintage glamour and timeless beauty.',
  },
  '1940s': {
    title: '1940s Glamour Girls Gallery | Vintage Hollywood Actresses',
    description: 'Discover glamour girls from the 1940s era. Browse photos of vintage Hollywood actresses from the classic film era.',
    heroTitle: '1940s Gallery',
    intro: 'The 1940s brought a new level of sophistication to Hollywood glamour. Explore our collection of stunning actresses from this iconic decade, featuring the stars who defined vintage elegance and cinematic beauty.',
  },
  '1950s': {
    title: '1950s Glamour Girls Gallery | Classic Pinup & Hollywood Stars',
    description: 'Browse our gallery of 1950s glamour girls. Discover photos of classic pinup models and Hollywood actresses from the 1950s era.',
    heroTitle: '1950s Gallery',
    intro: 'The 1950s epitomized classic pinup glamour and Hollywood stardom. This gallery celebrates the beautiful actresses and models who became icons of this unforgettable decade, showcasing the perfect blend of elegance and allure.',
  },
  '1960s': {
    title: '1960s Glamour Girls Gallery | Swinging Sixties Actresses',
    description: 'Explore glamour girls from the 1960s era. Browse photos of actresses from the swinging sixties and classic Hollywood.',
    heroTitle: '1960s Gallery',
    intro: 'The 1960s marked a revolution in style and glamour. Discover our collection of stunning actresses from this transformative decade, featuring the stars who brought a fresh, modern elegance to the silver screen.',
  },
};

const VALID_ERAS = ['1930s', '1940s', '1950s', '1960s'];

export async function generateMetadata({ params }: { params: Promise<{ era: string }> }): Promise<Metadata> {
  const { era } = await params;
  const eraInfo = ERA_INFO[era as keyof typeof ERA_INFO];

  if (!eraInfo) {
    return {
      title: 'Glamour Girls Gallery',
      description: 'Browse our collection of glamour girls',
    };
  }

  // Get base URL for metadata (synchronous, safe for generateMetadata)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://www.glamourgirlsofthesilverscreen.com' 
      : '');

  const canonicalUrl = baseUrl ? `${baseUrl}/explore/${era}` : `/explore/${era}`;

  return {
    title: eraInfo.title,
    description: eraInfo.description,
    openGraph: {
      title: eraInfo.title,
      description: eraInfo.description,
      url: canonicalUrl,
      siteName: 'Glamour Girls of the Silver Screen',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: eraInfo.title,
      description: eraInfo.description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

// Enable static generation with revalidation
export const revalidate = 3600; // Revalidate every hour

export default async function ExploreEraPage({ params }: { params: Promise<{ era: string }> }) {
  const { era } = await params;

  if (!VALID_ERAS.includes(era)) {
    notFound();
  }

  const eraInfo = ERA_INFO[era as keyof typeof ERA_INFO];

  // Fetch data server-side for pre-rendering
  let gridData = null;
  try {
    // Resolve base URL dynamically (same pattern as actress detail page)
    let baseUrl: string;
    try {
      const headersList = await headers();
      const host = headersList.get('host');
      const protocol = headersList.get('x-forwarded-proto') || 'https';
      
      if (host) {
        baseUrl = `${protocol}://${host}`;
      } else {
        // Use environment variable or production domain, never localhost
        baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
          (process.env.NODE_ENV === 'production' 
            ? 'https://www.glamourgirlsofthesilverscreen.com' 
            : '');
      }
    } catch (error) {
      // Use environment variable or production domain, never localhost
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://www.glamourgirlsofthesilverscreen.com' 
          : '');
    }
    
    const response = await fetch(`${baseUrl}/api/grid/era/${era}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
      headers: {
        'Cache-Control': 'no-store',
      },
    });
    
    if (response.ok) {
      const jsonData = await response.json();
      // Ensure the data structure matches what the component expects
      if (jsonData && typeof jsonData === 'object' && 'success' in jsonData) {
        gridData = jsonData;
      } else {
        console.error('Invalid grid data structure:', jsonData);
        gridData = null;
      }
    } else {
      console.error(`Failed to fetch grid data: ${response.status} ${response.statusText}`);
      gridData = null;
    }
  } catch (error) {
    console.error('Error fetching grid data:', error);
  }

  // Get random hero collage from saved versions (1-3)
  const heroImage = await getRandomHeroCollage(era) || '/images/hero-image.png';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <Header />

      <main className="flex-1">
        {/* Hero Section with Background Image */}
        <section className="relative w-full h-[50vh] md:h-[60vh] lg:h-[68vh] overflow-hidden">
          {/* Background Image - Randomly selected from saved collages */}
          {heroImage && (
            <div className="absolute inset-0">
              <Image
                src={heroImage}
                alt={`${eraInfo.heroTitle} - Glamour Girls of the Silver Screen`}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </div>
          )}

          {/* Optional Charcoal Overlay (max 35% opacity) */}
          <div 
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
          />

          {/* Content - Big White Text "1930s Gallery" - exact same styles as homepage "Glamour Girls" */}
          <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4 md:px-6 lg:px-8 max-w-[1440px] mx-auto w-full">
            <div className="max-w-5xl flex flex-col items-center w-full">
              <h1 
                className="mb-4 font-normal text-center"
                style={{ 
                  fontFamily: 'var(--font-logo-primary)',
                  color: '#FFFDF7',
                  fontSize: 'clamp(3.8rem, 11vw, 11.5rem)',
                  lineHeight: '1.05',
                  letterSpacing: '0',
                  fontWeight: 400,
                  textShadow: '0 8px 22px rgba(0,0,0,0.55)',
                  maxWidth: '80%',
                  textTransform: 'none',
                }}
              >
                {eraInfo.heroTitle}
              </h1>
            </div>
          </div>
        </section>

        {/* Grid Gallery Section - No header text, just intro and grid */}
        <section className="px-6 py-8 bg-[var(--bg-page)]">
          <div className="max-w-[1600px] mx-auto">
            <div className="mb-8 text-center">
              <p className="text-gray-700 max-w-3xl mx-auto text-lg leading-relaxed" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {eraInfo.intro}
              </p>
            </div>
            
            {/* Grid Gallery */}
            <div className="px-6">
              <EraGridGalleryOptimized era={era} initialData={gridData} />
            </div>
          </div>
        </section>

        {/* Explore Other Eras Section - Full Width with Lighter Background */}
        <section className="w-full py-10 md:py-16 px-4 md:px-6 lg:px-8 bg-[var(--bg-surface)]">
          <div className="max-w-[1600px] mx-auto">
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
              <h2
                className="text-[var(--text-primary)] mb-4 text-center"
                style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: 'var(--h2-size)',
                  letterSpacing: 'var(--h2-letter-spacing)',
                  lineHeight: 'var(--h2-line-height)',
                  textTransform: 'uppercase',
                }}
              >
                Explore Other Eras
              </h2>
              <p className="text-[var(--text-secondary)] mb-8 text-base leading-relaxed text-center">
                Discover glamour girls from other decades of classic Hollywood.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                {VALID_ERAS.map((otherEra) => {
                  if (otherEra === era) return null;
                  const eraLabel = otherEra === '1930s' ? "1930's" : 
                                 otherEra === '1940s' ? "1940's" :
                                 otherEra === '1950s' ? "1950's" :
                                 otherEra === '1960s' ? "1960's" : otherEra;
                  return (
                    <VintageButton
                      key={otherEra}
                      href={`/explore/${otherEra}`}
                    >
                      {eraLabel}
                    </VintageButton>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

