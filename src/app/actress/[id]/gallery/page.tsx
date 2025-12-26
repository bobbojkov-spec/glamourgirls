import { redirect, notFound } from 'next/navigation';
import { fetchActressFromDb } from '@/lib/actress/fetchActress';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

  // Always redirect to detail page (gallery pages no longer exist)
  if (actressData.slug) {
    redirect(`/actress/${id}/${actressData.slug}`);
  } else {
    redirect(`/actress/${id}`);
  }
}
