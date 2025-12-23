import Link from 'next/link';
import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { GalleryGrid, GalleryImage } from '@/components/gallery';

// Era background colors
const eraBackgrounds: Record<string, string> = {
  '20-30s': 'era-30s',
  '40s': 'era-40s',
  '50s': 'era-50s',
  '60s': 'era-60s',
};

// ISR: Revalidate every hour
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string; slug: string }>;
}

// Generate static params for all actresses with gallery images
// Note: This runs at build time, so we'll make it optional to avoid build-time DB dependency
export async function generateStaticParams() {
  // Return empty array - pages will be generated on-demand
  // This avoids requiring database access at build time
  return [];
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, slug } = await params;
  try {
    const actressData = await fetchActressData(id);
    
    if (!actressData) {
      return {
        title: 'Actress Gallery',
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';
    const actressName = actressData.name;
    const title = `${actressName} Photo Gallery - ${actressName} Pictures | ${slug}`;
    const description = `${actressName} Photo Gallery - Browse our collection of ${actressName} pictures and photographs. ${actressName} Images from Glamour Girls of the Silver Screen.`;
    
    // Get first gallery image for og:image
    let ogImage: string | undefined;
    if (actressData.images?.gallery?.[0]?.url) {
      const galleryUrl = actressData.images.gallery[0].url;
      ogImage = galleryUrl.startsWith('http') ? galleryUrl : `${baseUrl}${galleryUrl.startsWith('/') ? galleryUrl : '/' + galleryUrl}`;
    }
    
    const canonicalUrl = `${baseUrl}/actress/${id}/${slug}/gallery`;
    
    return {
      title,
      description,
      keywords: [`${actressName}`, 'Glamour Girls', 'Hollywood actresses', 'Photo Gallery', 'Vintage Photos'],
      robots: 'index,follow',
      openGraph: {
        title: `${actressName} Photo Gallery`,
        description: description,
        images: ogImage ? [{ url: ogImage }] : undefined,
        url: canonicalUrl,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${actressName} Photo Gallery`,
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
      title: 'Actress Gallery',
    };
  }
}

const resolveBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  return 'http://localhost:3000';
};

async function fetchActressData(id: string) {
  try {
    const baseUrl = resolveBaseUrl();
    const res = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      return null;
    }
    
    const data = await res.json();
    
    // Map era
    const eraMap: Record<string, string> = {
      '20-30s': '20-30s',
      '40s': '40s',
      '50s': '50s',
      '60s': '60s',
    };
    
    // Build image URLs
    const baseUrlFull = resolveBaseUrl();
    const buildImageUrl = (path: string) => {
      if (!path) return '';
      if (path.startsWith('http')) return path;
      return path.startsWith('/') ? `${baseUrlFull}${path}` : `${baseUrlFull}/${path}`;
    };

    // Transform API response to match expected format
    const galleryImages = (data.images?.gallery || []).map((img: any) => ({
      id: img.id,
      url: buildImageUrl(img.url),
      width: img.width,
      height: img.height,
      thumbnailUrl: buildImageUrl(img.thumbnailUrl || img.url),
    }));

    const hqImages = (data.images?.hq || []).map((img: any) => ({
      id: img.id,
      url: buildImageUrl(img.url),
      width: img.width,
      height: img.height,
    }));

    return {
      id: data.id,
      name: data.name,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      slug: data.slug,
      era: data.era || '50s',
      images: {
        gallery: galleryImages,
        hq: hqImages,
      },
    };
  } catch (error) {
    console.error('Error fetching actress data:', error);
    return null;
  }
}

// Helper to find HQ image for a gallery image
function findHQ(galleryImageId: number, hqImages: any[]): any {
  // HQ is usually galleryImageId - 1
  return hqImages.find((hq: any) => hq.id === galleryImageId - 1) || 
         hqImages.find((hq: any) => hq.id === galleryImageId + 1);
}

export default async function GalleryPage({ params }: PageProps) {
  const { id, slug } = await params;
  
  // Fetch actress data from API
  const actressData = await fetchActressData(id);
  
  if (!actressData) {
    notFound();
    return;
  }

  // Redirect if slug doesn't match
  if (actressData.slug && actressData.slug !== slug) {
    redirect(`/actress/${id}/${actressData.slug}/gallery`);
  }

  const bgClass = eraBackgrounds[actressData.era] || 'era-30s';
  
  // Map database images to GalleryImage format
  const galleryImages: GalleryImage[] = (actressData.images?.gallery || []).map((galleryImg: any) => {
    const hqImage = findHQ(galleryImg.id, actressData.images?.hq || []);
    
    // Default price calculation (you can adjust this)
    const price = hqImage ? 9.90 : undefined;
    
    // Use thumbnailUrl from API, or fallback to gallery image
    const thumbnailUrl = galleryImg.thumbnailUrl || galleryImg.url;
    
    return {
      id: galleryImg.id.toString(),
      thumbnailUrl: thumbnailUrl || galleryImg.url,
      fullUrl: galleryImg.url,
      width: galleryImg.width,
      height: galleryImg.height,
      price,
      hasHQ: !!hqImage,
      hqWidth: hqImage?.width,
      hqHeight: hqImage?.height,
      hqUrl: hqImage?.url,
    };
  });

  return (
    <div className={`${bgClass} min-h-full`} style={{ paddingLeft: '7%', paddingRight: '7%' }}>
      {/* Breadcrumb */}
      <div className="px-6 py-3 border-b border-black/5">
        <nav className="breadcrumb w-full">
          <Link href="/search">Search</Link>
          <span className="breadcrumb-separator">›</span>
          <Link href={`/actress/${id}/${slug}`}>{actressData.name} Profile</Link>
          <span className="breadcrumb-separator">›</span>
          <span>{actressData.name} Photo Gallery</span>
        </nav>
      </div>

      {/* Main content */}
      <div className="px-6 py-8">
        <div className="w-full">
          {/* Title */}
          <h1 className="gallery-title">
            Photographs of {actressData.name}
          </h1>
          
          {/* Copyright notice */}
          <p className="text-sm text-gray-600 mb-6 pb-4 border-b border-black/10">
            This site and its contents are for private use only. Reproduction of any kind 
            of the {actressData.name} Images without consent is forbidden.
          </p>

          {/* Gallery Grid */}
          {galleryImages.length > 0 ? (
            <GalleryGrid 
              images={galleryImages} 
              actressId={actressData.id.toString()}
              actressName={actressData.name} 
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No photos available for this actress.</p>
            </div>
          )}

          {/* Info box - Only show if there are HQ images */}
          {galleryImages.some(img => img.hasHQ) && (
            <div className="mt-8">
              <p className="mb-2" style={{ fontSize: '12px' }}>
                To purchase the HQ download of a photo (suitable for print), click on the image 
                and use the &quot;Add to Cart&quot; button.
              </p>
              <p className="mb-2" style={{ fontSize: '12px' }}>
                Automatic discounts apply if you buy more than 5 and 10 images.
              </p>
              <p style={{ fontSize: '12px' }}>
                You can add multiple photos to your cart and checkout via secure Stripe payment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


