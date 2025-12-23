import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // Daily

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';
    
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/search', priority: '0.9', changefreq: 'weekly' },
    ];

    const urls = staticPages.map(page => {
      return `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    console.error('Error generating static sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

