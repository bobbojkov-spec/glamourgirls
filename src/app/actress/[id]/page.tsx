import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Redirect old /actress/[id] URLs to /actress/[id]/[slug]
export default async function ActressPageRedirect({ params }: PageProps) {
  const { id } = await params;
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const res = await fetch(`${baseUrl}/api/actresses/${id}`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      return (
        <div className="min-h-full flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl mb-4">Actress not found</h1>
          </div>
        </div>
      );
    }
    
    const actressData = await res.json();
    const slug = actressData.slug || `${actressData.firstName || ''}-${actressData.lastName || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    redirect(`/actress/${id}/${slug}`);
  } catch (error) {
    console.error('Error redirecting:', error);
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Error loading page</h1>
        </div>
      </div>
    );
  }
}
