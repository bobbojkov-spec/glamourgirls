import Link from 'next/link';
import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import ViewTracker from '@/components/actress/ViewTracker';
import ActressBio from '@/components/actress/ActressBio';
import ActressSourcesLinks from '@/components/actress/ActressSourcesLinks';
import GalleryGrid, { GalleryImage } from '@/components/gallery/GalleryGrid';
import { Header, Footer } from '@/components/newdesign';
import HeroGalleryButton from '@/components/actress/HeroGalleryButton';
import HeadshotImage from '@/components/actress/HeadshotImage';
import FeaturedPhoto from '@/components/actress/FeaturedPhoto';
import FavoriteButton from '@/components/actress/FavoriteButton';
import RelatedActressesGrid from '@/components/actress/RelatedActressesGrid';
import Breadcrumb from '@/components/ui/Breadcrumb';
import type { Actress } from '@/types/actress';

interface FeaturedImage {
  id: number;
  displayUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  price?: number;
}

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

const normalizeImageUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return path.startsWith('/') ? path : `/${path}`;
};

const formatYearRange = (birth?: number | null, death?: number | null) => {
  if (!birth && !death) return '';
  if (birth && death) return `${birth} – ${death}`;
  if (birth && !death) return `${birth} – Present`;
  return death ? `– ${death}` : '';
};

const selectFeaturedImage = (actress: Actress): FeaturedImage | null => {
  const hqImage = actress.images?.hq?.[0];
  if (hqImage) {
    const galleryMatch = actress.images?.gallery?.find(
      (img) => Math.abs(Number(img.id) - Number(hqImage.id)) <= 1
    );

    return {
      id: Number(hqImage.id),
      displayUrl: normalizeImageUrl(galleryMatch?.url || hqImage.url),
      downloadUrl: normalizeImageUrl(hqImage.url),
      width: hqImage.width,
      height: hqImage.height,
      price: 9.9, // HQ images have a price
    };
  }

  const galleryImage = actress.images?.gallery?.[0];
  if (galleryImage) {
    // Check if there's an HQ version for this gallery image
    const hqForGallery = findHQForGallery(Number(galleryImage.id), actress.images?.hq || []);
    
    return {
      id: Number(galleryImage.id),
      displayUrl: normalizeImageUrl(galleryImage.url),
      downloadUrl: normalizeImageUrl(galleryImage.url),
      width: galleryImage.width,
      height: galleryImage.height,
      price: hqForGallery ? 9.9 : undefined, // Only has price if HQ is available
    };
  }

  return null;
};

const findHQForGallery = (galleryId: number, hqImages: NonNullable<Actress['images']>['hq'] = []) => {
  return (
    hqImages.find((hq) => Number(hq.id) === galleryId - 1) ||
    hqImages.find((hq) => Number(hq.id) === galleryId + 1) ||
    null
  );
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params;
  try {
    const baseUrl = await resolveBaseUrl();
    const res = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store',
      },
    });
    
    if (!res.ok) {
      return {
        title: 'Actress Profile',
      };
    }
    
    const actressData = await res.json();
    const baseUrlFull = await resolveBaseUrl();
    const actressName = actressData.name;
    const birthName = actressData.birthName ? ` (${actressData.birthName})` : '';
    
    const title = `${actressName} - The Private Life and Times of ${actressName}. ${actressName} Pictures. | ${slug}`;
    const description = `${actressName} Pictures - Private Life and Times of ${actressName}. ${actressName} Photo Gallery. ${actressName}${birthName}; Glamour Girls of the Silver Screen - The Private Lives and Times of Some of the Most Glamorous Actresses and Starlets of the Forties, Fifties and Sixties.`;
    const keywords = `Glamour, Glamour Girls, Hollywood stars, famous Hollywood girls, moviestar history, Ladies of Hollywood, famous ladies of Hollywood, glamour girls private stories, glamour stargirls, glamour moviestars. famous actresses, Hollywood glamour actresses, Fifties, Forties, Sixties, 40's, 50's, 60's, Pin-up girls, Pin up Hollywood actresses, Hollywood Film Movies, ${actressName}`;
    
    let ogImage: string | undefined;
    if (actressData.images?.gallery?.[0]?.url) {
      const galleryUrl = actressData.images.gallery[0].url;
      ogImage = galleryUrl.startsWith('http') ? galleryUrl : `${baseUrlFull}${galleryUrl.startsWith('/') ? galleryUrl : '/' + galleryUrl}`;
    }
    
    const canonicalUrl = `${baseUrlFull}/actress/${id}/${slug}`;
    
    return {
      title,
      description,
      keywords: keywords.split(',').map((k: string) => k.trim()),
      robots: 'index,follow',
      other: {
        'revisit-after': '30 days',
        publisher: 'Glamour Girls of the Silver Screen',
        'page-topic': 'Glamour Girls, Hollywood actresses',
        'page-type': 'Famous Actresses, Glamour Girls',
        'Content-Language': 'en',
        distribution: 'global',
        audience: 'all',
      },
      openGraph: {
        title: actressName,
        description: description,
        images: ogImage ? [{ url: ogImage }] : undefined,
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title: actressName,
        description: description,
        images: ogImage ? [ogImage] : undefined,
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Actress Profile',
    };
  }
}

const resolveBaseUrl = async () => {
  // Try to get the host from request headers first (works on Vercel)
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // Headers might not be available in all contexts
    console.warn('Could not get headers for base URL:', error);
  }
  
  // Fallback to environment variables
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Use VERCEL_URL on Vercel (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL;
    // Check if it already includes protocol
    if (vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')) {
      return vercelUrl;
    }
    return `https://${vercelUrl}`;
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:3000';
};

async function fetchActress(id: string): Promise<Actress | null> {
  try {
    const baseUrl = await resolveBaseUrl();
    const res = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store',
      },
    });
    
    if (!res.ok) {
      console.warn(`Actress not available: ${id} (${res.status})`);
      return null;
    }
    
    const data = await res.json();
    
    // Log API response for debugging
    console.log(`[API] Loaded actress ${id}:`, {
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      headshotUrl: `/api/actresses/${id}/headshot`,
      hasImages: !!data.images?.gallery?.length,
      imageCount: data.images?.gallery?.length || 0,
    });
    
    return data;
  } catch (error) {
    console.warn(`Actress not available: ${id} (fetch error)`, error);
    return null;
  }
}

export default async function ActressPage({ params }: PageProps) {
  const { id, slug } = await params;
  const actressData: Actress | null = await fetchActress(id);
  
  if (!actressData) {
    notFound();
    return; // Explicit return to prevent any further execution
  }

  if (actressData.slug && actressData.slug !== slug) {
    redirect(`/actress/${id}/${actressData.slug}`);
  }

  const heroYears = formatYearRange(actressData.birthYear, actressData.deathYear);
  const featuredImage = selectFeaturedImage(actressData);
  // Get up to 4 featured images (2 or 4, always even number for desktop layout)
  const featuredImages: FeaturedImage[] = [];
  if (featuredImage) {
    featuredImages.push(featuredImage);
    // Try to get additional featured images (up to 3 more for max 4 total)
    const hqImages = actressData.images?.hq || [];
    const galleryImages = actressData.images?.gallery || [];
    
    // Get up to 3 more images (for total of 4)
    for (let i = 1; i < 4 && featuredImages.length < 4; i++) {
      if (hqImages.length > i) {
        const hqImg = hqImages[i];
        const galleryMatch = galleryImages.find(
          (img) => Math.abs(Number(img.id) - Number(hqImg.id)) <= 1
        );
        if (galleryMatch || hqImg) {
          featuredImages.push({
            id: Number(hqImg.id),
            displayUrl: normalizeImageUrl(galleryMatch?.url || hqImg.url),
            downloadUrl: normalizeImageUrl(hqImg.url),
            width: hqImg.width,
            height: hqImg.height,
            price: 9.9,
          });
        }
      } else if (galleryImages.length > i) {
        // If no more HQ images, use gallery images
        const galleryImg = galleryImages[i];
        const hqForGallery = findHQForGallery(Number(galleryImg.id), hqImages);
        featuredImages.push({
          id: Number(galleryImg.id),
          displayUrl: normalizeImageUrl(galleryImg.url),
          downloadUrl: normalizeImageUrl(galleryImg.url),
          width: galleryImg.width,
          height: galleryImg.height,
          price: hqForGallery ? 9.9 : undefined,
        });
      }
    }
    
    // Limit photos based on breakpoint requirements:
    // Mobile: max 4 (2 rows of 2) - keep all up to 4
    // Tablet: max 3 (1 row of 3) - hide 4th via CSS
    // Desktop: max 4 (2 rows of 2, must be even) - hide 3rd if we have 3
    if (featuredImages.length > 4) {
      featuredImages.splice(4);
    }
  }
  const relatedActresses = actressData.relatedActresses || [];
  const galleryImages = (actressData.images?.gallery || []).filter((img) => !!img?.url);
  const galleryGridImages: GalleryImage[] = galleryImages.map((galleryImg) => {
    const hqImage = findHQForGallery(Number(galleryImg.id), actressData.images?.hq || []);
    const price = hqImage ? 9.9 : undefined;

    return {
      id: galleryImg.id.toString(),
      thumbnailUrl: normalizeImageUrl(galleryImg.thumbnailUrl || galleryImg.url),
      fullUrl: normalizeImageUrl(galleryImg.url),
      width: galleryImg.width || 0,
      height: galleryImg.height || 0,
      price,
      hasHQ: !!hqImage,
      hqWidth: hqImage?.width,
      hqHeight: hqImage?.height,
      hqUrl: hqImage ? normalizeImageUrl(hqImage.url) : undefined,
    };
  });

  const actressName = actressData.name || 'Unknown';
  const heroFirstNameRaw = actressData.firstName || (actressName.includes(' ') ? actressName.split(' ')[0] : actressName) || actressName;
  const heroFirstName = heroFirstNameRaw.charAt(0).toUpperCase() + heroFirstNameRaw.slice(1).toLowerCase();
  const heroLastName =
    actressData.lastName ||
    (actressName.includes(heroFirstNameRaw) ? actressName.replace(heroFirstNameRaw, '').trim() : actressName) ||
    heroFirstNameRaw;
  const heroImage = `/api/actresses/${id}/headshot`;

  // Log hero section data for debugging
  console.log(`[Hero] Rendering hero section:`, {
    actressName,
    heroFirstName,
    heroLastName,
    heroImage,
  });

  return (
    <>
      <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
        <ViewTracker actressId={actressData.id.toString()} />
        <Header />

        <main className="flex-1">
        {/* Hero Section - Fixed min-height to prevent layout shift */}
        <section 
          className="relative w-full overflow-hidden" 
          style={{ 
            backgroundColor: '#f6e5c0',
            minHeight: '450px',
            maxHeight: '480px',
            paddingTop: 'clamp(40px, 6vh, 68px)',
            paddingBottom: 'clamp(40px, 6vh, 68px)',
          }}
        >
          <div 
            className="mx-auto w-full px-6 flex justify-center items-center"
            style={{ maxWidth: '1280px' }}
          >
            {/* Combined Block - Headshot + Name + Button, centered */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
              {/* Headshot (tilted, framed) - Fixed aspect ratio to prevent layout shift */}
              <div className="relative flex flex-col justify-center items-center gap-4" style={{ 
                width: 'clamp(150px, 25vw, 200px)', 
                minWidth: '150px',
                flexShrink: 0,
              }}>
                <div className="relative" style={{ 
                  aspectRatio: '3/4', 
                  width: '100%',
                  maxWidth: '100%',
                }}>
                  <HeadshotImage
                    src={heroImage}
                    alt={`${actressName} portrait`}
                    className="w-full h-full object-cover rounded-xl border-[10px] border-white shadow-lg transform rotate-[-2deg]"
                    theirMan={actressData.theirMan}
                  />
                </div>
                <FavoriteButton
                  actressId={actressData.id.toString()}
                  actressName={actressName}
                  actressSlug={actressData.slug || `${actressData.id}`}
                  thumbnailUrl={heroImage}
                />
              </div>

                  {/* Name + Button - Fixed font sizes to prevent layout shift */}
              <div className="relative text-center" style={{ marginTop: '0', minHeight: '120px' }}>
                <h1 className="leading-none" style={{ minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span 
                    className="block text-[var(--text-primary)]"
                    style={{ 
                      fontFamily: 'Alex Brush, cursive', 
                      textTransform: 'none',
                      textShadow: '0 0 6px white, 0 0 12px white, 0 0 18px white',
                      fontSize: 'clamp(1.5rem, 4vw, 2rem)', /* Responsive but stable */
                      lineHeight: '1.2',
                    }}
                  >
                    {heroFirstName}
                  </span>
                  <span 
                    className="block text-[var(--text-primary)]"
                    style={{ 
                      fontFamily: 'Broadway BT, serif',
                      textShadow: '0 0 6px white, 0 0 12px white, 0 0 18px white',
                      fontSize: 'clamp(3rem, 8vw, 4.5rem)', /* Responsive but stable */
                      lineHeight: '1.1',
                      marginTop: '0.25rem',
                    }}
                  >
                    {heroLastName}
                  </span>
                </h1>

                <div className="flex justify-center mt-8">
                  <HeroGalleryButton
                    galleryImages={galleryGridImages}
                    actressId={actressData.id.toString()}
                    actressName={actressName}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Section - Fixed max-width to prevent layout shift */}
        <section 
          className="bg-[var(--bg-page)] px-4 md:px-6 lg:px-8"
          style={{ 
            paddingTop: '2rem',
            paddingBottom: '2.5rem', /* Mobile: 2.5rem */
          }}
        >
          <div 
            className="mx-auto w-full"
            style={{ maxWidth: '1280px' }}
          >
            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: 'Search', href: '/search' },
                { label: actressName },
              ]}
            />

            {/* Placeholder Content Area */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {/* content later */}
            </div>

            {/* Layout: Mobile/Tablet single column, Desktop two columns */}
            <div 
              className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,0.8fr)]"
              style={{
                gap: '1.5rem', /* Mobile/Tablet: tighter spacing */
              }}
            >
              {/* Left Column - Main Content */}
              <div 
                className="space-y-6"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem', /* Tablet: tighter spacing */
                }}
              >
                {/* Timeline Section - Full Width */}
                <div className="w-full">
                  <ActressBio timeline={actressData.timeline || []} birthName={actressData.birthName} />
                </div>

                {/* Sources & Links Section - Right below Timeline, in homepage-style box */}
                {(actressData.sources || actressData.links?.length || actressData.books?.length) && (
                  <div className="w-full bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
                    <h3
                      className="text-[var(--text-primary)] mb-6"
                      style={{
                        fontFamily: 'var(--font-headline)',
                        fontSize: 'var(--h2-size)',
                        letterSpacing: 'var(--h2-letter-spacing)',
                        lineHeight: 'var(--h2-line-height)',
                      }}
                    >
                      Sources &amp; Links
                    </h3>
                    <ActressSourcesLinks
                      sources={actressData.sources}
                      links={actressData.links}
                      books={actressData.books}
                    />
                  </div>
                )}

                {/* Featured Photos Section - Mobile/Tablet: In main column, Desktop: In sidebar */}
                {featuredImages.length > 0 && (
                  <div 
                    className="p-5 md:p-6 rounded-xl lg:hidden" 
                    style={{ backgroundColor: '#f6e5c0' }}
                  >
                    <h3
                      className="text-[var(--text-primary)] mb-4"
                      style={{
                        fontFamily: 'var(--font-headline)',
                        fontSize: 'var(--h2-size)',
                        letterSpacing: 'var(--h2-letter-spacing)',
                        lineHeight: 'var(--h2-line-height)',
                      }}
                    >
                      Featured Photo
                    </h3>
                    <div className="mt-[15px]">
                      {/* 
                        Mobile (max-width: 767px): 2 columns, max 4 photos (2 rows of 2)
                        Tablet (min-width: 768px, max-width: 1023px): 3 columns, max 3 photos (1 row of 3)
                      */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {featuredImages.slice(0, 3).map((img, index) => {
                        // Mobile: show up to 4, Tablet: show up to 3
                        const isFourthItem = index === 3;
                        return (
                          <div
                            key={index}
                            className={isFourthItem ? 'hidden' : ''}
                          >
                            <FeaturedPhoto
                              image={img}
                              actressId={actressData.id.toString()}
                              actressName={actressName}
                            />
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Photo Gallery Section - Right after Featured Photos on Mobile/Tablet */}
                {galleryGridImages.length > 0 && (
                  <div className="w-full bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
                    <h3
                      className="text-[var(--text-primary)] mb-6 text-left"
                      style={{
                        fontFamily: 'var(--font-headline)',
                        fontSize: 'var(--h2-size)',
                        letterSpacing: 'var(--h2-letter-spacing)',
                        lineHeight: 'var(--h2-line-height)',
                      }}
                    >
                      Photo Gallery
                    </h3>
                    <div className="text-left mt-[15px]">
                      <GalleryGrid
                        images={galleryGridImages}
                        actressId={actressData.id.toString()}
                        actressName={actressName}
                        theirMan={actressData.theirMan}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar (Desktop Only) */}
              <div className="hidden lg:block">
                <div className="space-y-6">
                {/* Featured Photo Section - Desktop Only */}
                {featuredImages.length > 0 && (
                  <div className="p-6 rounded-xl" style={{ backgroundColor: '#f6e5c0' }}>
                    <h3
                      className="text-[var(--text-primary)] mb-4"
                      style={{
                        fontFamily: 'var(--font-headline)',
                        fontSize: 'var(--h2-size)',
                        letterSpacing: 'var(--h2-letter-spacing)',
                        lineHeight: 'var(--h2-line-height)',
                      }}
                    >
                      Featured Photo
                    </h3>
                    <div className="mt-[15px]">
                      {/* 
                        Mobile (max-width: 767px): 2 columns, max 4 photos (2 rows of 2)
                        Tablet (min-width: 768px, max-width: 1023px): 3 columns, max 3 photos (1 row of 3)
                        Desktop (min-width: 1024px): 2 columns, max 4 photos (2 rows of 2), must be even
                      */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-4 mb-4">
                      {featuredImages.map((img, index) => {
                        // Visibility logic per breakpoint:
                        // Mobile (default, <768px): Show all up to 4 (indices 0,1,2,3) - 2 columns
                        // Tablet (md: 768px-1023px): Show first 3 (indices 0,1,2) - 3 columns, hide index 3
                        // Desktop (lg: 1024px+): Show 2 or 4 (if 3 total, hide index 2) - 2 columns
                        
                        const isFourthItem = index === 3;
                        const isThirdItemWithThreeTotal = index === 2 && featuredImages.length === 3;
                        
                        let visibilityClasses = '';
                        if (index >= 4) {
                          visibilityClasses = 'hidden'; // Hide 5th+ on all breakpoints
                        } else if (isFourthItem) {
                          visibilityClasses = 'hidden md:hidden lg:block'; // Hide 4th on mobile/tablet, show on desktop
                        } else if (isThirdItemWithThreeTotal) {
                          visibilityClasses = 'lg:hidden'; // Hide 3rd on desktop when we have exactly 3 total
                        }
                        
                        return (
                          <div
                            key={index}
                            className={visibilityClasses}
                          >
                            <FeaturedPhoto
                              image={img}
                              actressId={actressData.id.toString()}
                              actressName={actressName}
                            />
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Related Actresses Section - Right after Featured Photo */}
                {relatedActresses.length > 0 && (
                  <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] p-5 md:p-6">
                    <div className="space-y-4">
                      <h3
                        className="text-[var(--text-primary)] mb-4"
                        style={{
                          fontFamily: 'var(--font-headline)',
                          fontSize: 'var(--h2-size)',
                          letterSpacing: 'var(--h2-letter-spacing)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Related Actresses
                      </h3>
                      <RelatedActressesGrid actresses={relatedActresses} />
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Info - Full Width, At the very bottom */}
        <section className="w-full bg-[var(--bg-page)] py-8 px-4 md:px-6 lg:px-8 border-t border-[var(--border-subtle)]">
          <div className="max-w-[1600px] mx-auto text-xs text-[var(--text-secondary)] space-y-2">
            <p>
              This site and its contents are for private use only. Reproduction of any kind of the{' '}
              {actressName} images without consent is forbidden.
            </p>
            {galleryGridImages.some(img => img.hasHQ) && (
              <>
                <p>
                  To purchase the HQ download of a photo (suitable for print), click on the image and use the
                  &quot;Add to Cart&quot; button.
                </p>
                <p>Automatic discounts apply if you buy more than 5 and 10 images.</p>
                <p>You can add multiple photos to your cart and checkout via secure Stripe payment.</p>
              </>
            )}
          </div>
        </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
