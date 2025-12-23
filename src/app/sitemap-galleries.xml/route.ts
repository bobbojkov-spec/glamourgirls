import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';
    
    const [galleries] = await pool.execute(
      `SELECT g.id as girlId, g.slug, i.id as imageId
       FROM images i
       JOIN girls g ON i.girlid = g.id
       WHERE i.mytp = 4 
         AND g.published = 1
         AND i.path IS NOT NULL
       ORDER BY g.id, i.id`
    ) as any[];

    const urls = galleries.map((gallery: any) => {
      return `  <url>
    <loc>${baseUrl}/actress/${gallery.girlId}/${gallery.slug}/gallery</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }).join('\n');

    // Deduplicate by girlId
    const uniqueUrls = Array.from(
      new Set(galleries.map((g: any) => `${baseUrl}/actress/${g.girlId}/${g.slug}/gallery`))
    ).map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating galleries sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

