import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { GalleryGrid, GalleryImage } from '@/components/gallery';
import { fetchActressFromDb } from '@/lib/actress/fetchActress';

// Era background colors
const eraBackgrounds: Record<string, string> = {
  '20-30s': 'era-30s',
  '40s': 'era-40s',
  '50s': 'era-50s',
  '60s': 'era-60s',
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Helper to find HQ image for a gallery image
function findHQ(galleryImageId: number, hqImages: any[]): any {
  // HQ is usually galleryImageId - 1
  return hqImages.find((hq: any) => hq.id === galleryImageId - 1) || 
         hqImages.find((hq: any) => hq.id === galleryImageId + 1);
}

// Helper function to check if image meets HQ requirements (minimum 1200px on long side)
function isHQImage(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  const longSide = Math.max(width, height);
  return longSide >= 1200;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GalleryPage({ params }: PageProps) {
  const { id } = await params;
  
  // Validate and convert id to number
  const actressId = parseInt(id);
  if (isNaN(actressId) || actressId <= 0) {
    notFound();
    return;
  }
  
  // Fetch directly from database (no HTTP call)
  let actressData = null;
  try {
    actressData = await fetchActressFromDb(actressId);
  } catch (error) {
    console.error(`Error fetching actress ${actressId}:`, error);
    notFound();
    return;
  }
  
  if (!actressData) {
    notFound();
    return;
  }

  // Redirect to slug-based URL if slug is available
  if (actressData.slug) {
    redirect(`/actress/${id}/${actressData.slug}/gallery`);
  }

  const bgClass = eraBackgrounds[actressData.era] || 'era-30s';
  
  // Map database images to GalleryImage format
  const galleryImages: GalleryImage[] = (actressData.images?.gallery || []).map((galleryImg: any) => {
    const hqImage = findHQ(galleryImg.id, actressData.images?.hq || []);
    
    // Only mark as HQ if it meets the 1200px minimum requirement
    const meetsHQRequirement = hqImage && isHQImage(hqImage.width, hqImage.height);
    const price = meetsHQRequirement ? 9.90 : undefined;
    
    // Use thumbnailUrl from API, or fallback to gallery image
    const thumbnailUrl = galleryImg.thumbnailUrl || galleryImg.url;
    
    return {
      id: galleryImg.id.toString(),
      thumbnailUrl: thumbnailUrl || galleryImg.url,
      fullUrl: galleryImg.url,
      width: galleryImg.width,
      height: galleryImg.height,
      price,
      hasHQ: !!meetsHQRequirement,
      hqWidth: meetsHQRequirement ? hqImage?.width : undefined,
      hqHeight: meetsHQRequirement ? hqImage?.height : undefined,
      hqUrl: meetsHQRequirement ? hqImage?.url : undefined,
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
              actressSlug={actressData.slug || `${actressData.id}`}
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
