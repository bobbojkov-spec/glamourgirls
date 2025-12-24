import Link from 'next/link';
import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
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
    const baseUrl = resolveBaseUrl();
    const res = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      return {
        title: 'Actress Profile',
      };
    }
    
    const actressData = await res.json();
    const baseUrlFull = resolveBaseUrl();
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

const resolveBaseUrl = () => {
  // Use NEXT_PUBLIC_BASE_URL if available (works in server components)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Use VERCEL_URL on Vercel (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback to localhost for local development
  return 'http://localhost:3000';
};

async function fetchActress(id: string): Promise<Actress | null> {
  try {
    const baseUrl = resolveBaseUrl();
    const res = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
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
  // Get up to 2 featured images
  const featuredImages: FeaturedImage[] = [];
  if (featuredImage) {
    featuredImages.push(featuredImage);
    // Try to get a second featured image
    const hqImages = actressData.images?.hq || [];
    const galleryImages = actressData.images?.gallery || [];
    if (hqImages.length > 1) {
      const secondHQ = hqImages[1];
      const secondGalleryMatch = galleryImages.find(
        (img) => Math.abs(Number(img.id) - Number(secondHQ.id)) <= 1
      );
      if (secondGalleryMatch || secondHQ) {
        featuredImages.push({
          id: Number(secondHQ.id),
          displayUrl: normalizeImageUrl(secondGalleryMatch?.url || secondHQ.url),
          downloadUrl: normalizeImageUrl(secondHQ.url),
          width: secondHQ.width,
          height: secondHQ.height,
          price: 9.9,
        });
      }
    } else if (galleryImages.length > 1) {
      // If no second HQ, use second gallery image
      const secondGallery = galleryImages[1];
      const hqForSecond = findHQForGallery(Number(secondGallery.id), hqImages);
      featuredImages.push({
        id: Number(secondGallery.id),
        displayUrl: normalizeImageUrl(secondGallery.url),
        downloadUrl: normalizeImageUrl(secondGallery.url),
        width: secondGallery.width,
        height: secondGallery.height,
        price: hqForSecond ? 9.9 : undefined,
      });
    }
  }
  const relatedActresses = actressData.relatedActresses || [];
  const galleryImages = (actressData.images?.gallery || []).filter((img) => !!img?.url);
  
  // Debug logging
  console.log(`[Gallery] Processing gallery for actress ${id}:`, {
    galleryCount: galleryImages.length,
    galleryImages: galleryImages.map(img => ({ id: img.id, url: img.url?.substring(0, 80) + '...', thumbnailUrl: img.thumbnailUrl?.substring(0, 80) + '...' })),
  });
  
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
        {/* Hero Section - Asymmetric Layout */}
        <section className="relative w-full py-[68px] overflow-hidden min-h-[51vh]" style={{ backgroundColor: '#f6e5c0' }}>
          <div className="mx-auto max-w-7xl px-6 flex justify-center items-center h-full">
            {/* Combined Block - Headshot + Name + Button, centered */}
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Headshot (tilted, framed) - 20% bigger than before */}
              <div className="relative flex flex-col justify-center h-full items-center gap-4">
                <HeadshotImage
                  src={heroImage}
                  alt={`${actressName} portrait`}
                  className="w-full max-w-[1440px] md:max-w-[483px] md:h-[248%] md:object-contain rounded-xl border-[10px] border-white shadow-lg transform rotate-[-2deg]"
                  theirMan={actressData.theirMan}
                />
                <FavoriteButton
                  actressId={actressData.id.toString()}
                  actressName={actressName}
                  actressSlug={actressData.slug || `${actressData.id}`}
                  thumbnailUrl={heroImage}
                />
              </div>

              {/* Name + Button (offset upward) */}
              <div className="relative md:-mt-12 text-center md:text-left">
                <h1 className="leading-none">
                  <span 
                    className="block text-2xl md:text-3xl text-[var(--text-primary)]"
                    style={{ 
                      fontFamily: 'Alex Brush, cursive', 
                      textTransform: 'none',
                      textShadow: '0 0 6px white, 0 0 12px white, 0 0 18px white'
                    }}
                  >
                    {heroFirstName}
                  </span>
                  <span 
                    className="block text-6xl md:text-7xl text-[var(--text-primary)]"
                    style={{ 
                      fontFamily: 'Broadway BT, serif',
                      textShadow: '0 0 6px white, 0 0 12px white, 0 0 18px white'
                    }}
                  >
                    {heroLastName}
                  </span>
                </h1>

                <div className="flex justify-center md:justify-start mt-8">
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

        {/* Main Content Section */}
        <section className="bg-[var(--bg-page)] pb-10 md:pb-16 px-4 md:px-6 lg:px-8">
          <div className="max-w-[1600px] mx-auto">
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

            {/* Two Column Layout - Desktop */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(240px,0.8fr)]">
              {/* Left Column - Main Content */}
              <div className="space-y-8">
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

                {/* Photo Gallery Section - Right after Sources & Links */}
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
              <div className="lg:block space-y-8">
                {/* Featured Photo Section */}
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
                      <div className="grid grid-cols-3 gap-4 mb-4">
                      {featuredImages.slice(0, 3).map((img, index) => (
                        <FeaturedPhoto
                          key={index}
                          image={img}
                          actressId={actressData.id.toString()}
                          actressName={actressName}
                        />
                      ))}
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
