import { redirect, notFound } from 'next/navigation';
import { fetchActressFromDb } from '@/lib/actress/fetchActress';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Redirect old /actress/[id] URLs to /actress/[id]/[slug]
export default async function ActressPageRedirect({ params }: PageProps) {
  const { id } = await params;
  
  // Validate and convert id to number
  const actressId = parseInt(id);
  if (isNaN(actressId) || actressId <= 0) {
    notFound();
    return;
  }
  
  try {
    // Fetch directly from database (no HTTP call)
    const actressData = await fetchActressFromDb(actressId);
    
    if (!actressData) {
      notFound();
      return;
    }
    
    const slug = actressData.slug || `${actressData.firstName || ''}-${actressData.lastName || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    redirect(`/actress/${id}/${slug}`);
  } catch (error) {
    console.error('Error redirecting:', error);
    notFound();
    return;
  }
}
