import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GalleryGrid, GalleryImage } from '@/components/gallery';

// Era background colors
const eraBackgrounds: Record<string, string> = {
  '20-30s': 'era-30s',
  '40s': 'era-40s',
  '50s': 'era-50s',
  '60s': 'era-60s',
};

async function fetchActress(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch actress');
    }
    
    return await res.json();
  } catch (error) {
    console.error('Error fetching actress:', error);
    return null;
  }
}

// Helper to find HQ image for a gallery image
function findHQ(galleryImageId: number, hqImages: any[]): any {
  // HQ is usually galleryImageId - 1
  return hqImages.find((hq: any) => hq.id === galleryImageId - 1) || 
         hqImages.find((hq: any) => hq.id === galleryImageId + 1);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GalleryPage({ params }: PageProps) {
  const { id } = await params;
  
  // Fetch actress data from API
  const actressData = await fetchActress(id);
  
  if (!actressData) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Actress not found</h1>
          <Link href="/search" className="text-vintage-brown hover:underline">
            Return to Search
          </Link>
        </div>
      </div>
    );
  }

  // Redirect to slug-based URL if slug is available
  if (actressData.slug) {
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
          <Link href={actressData.slug ? `/actress/${id}/${actressData.slug}` : `/actress/${id}`}>{actressData.name} Profile</Link>
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
