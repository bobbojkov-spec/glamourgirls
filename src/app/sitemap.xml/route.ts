import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.glamourgirlsofthesilverscreen.com';
    
    // Get counts for sitemap index
    const [girlsCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM girls WHERE published = 1'
    ) as any[];
    
    const [imagesCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM images WHERE mytp = 4 AND girlid IN (SELECT id FROM girls WHERE published = 1)'
    ) as any[];

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-actresses.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-galleries.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`;

    return new NextResponse(sitemapIndex, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

