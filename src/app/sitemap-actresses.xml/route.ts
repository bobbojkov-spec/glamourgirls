import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';
    
    const [girls] = await pool.execute(
      `SELECT id, slug, updated_at 
       FROM girls 
       WHERE published = 1 
       ORDER BY id ASC`
    ) as any[];

    const urls = girls.map((girl: any) => {
      const lastmod = girl.updated_at 
        ? new Date(girl.updated_at).toISOString() 
        : new Date().toISOString();
      
      return `  <url>
    <loc>${baseUrl}/actress/${girl.id}/${girl.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating actresses sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

