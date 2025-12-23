import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get('pathname');

  if (!pathname) {
    return NextResponse.json(
      { error: 'Missing pathname parameter' },
      { status: 400 }
    );
  }

  try {
    // Check if redirect already exists
    const [existingRedirects] = await pool.execute(
      'SELECT new_url, redirect_type FROM url_redirects WHERE old_url = ? LIMIT 1',
      [pathname]
    ) as any[];

    if (Array.isArray(existingRedirects) && existingRedirects.length > 0) {
      const redirect = existingRedirects[0];
      return NextResponse.json({
        redirectUrl: redirect.new_url,
        status: redirect.redirect_type || 301,
      });
    }

    const oldUrlMatch = pathname.match(/^\/show\/(\d+)\/([^\/]+)\/index\.html$/i);

    if (!oldUrlMatch) {
      return NextResponse.json({ redirectUrl: null });
    }

    const [, oldId] = oldUrlMatch;

    const [girls] = await pool.execute(
      'SELECT id, slug FROM girls WHERE id = ? OR old_url = ? LIMIT 1',
      [parseInt(oldId, 10), pathname]
    ) as any[];

    if (Array.isArray(girls) && girls.length > 0) {
      const girl = girls[0];
      const newUrl = `/actress/${girl.id}/${girl.slug}`;

      await pool.execute(
        'INSERT INTO url_redirects (old_url, new_url, girlid, redirect_type) VALUES (?, ?, ?, 301) ON DUPLICATE KEY UPDATE new_url = VALUES(new_url)',
        [pathname, newUrl, girl.id]
      );

      return NextResponse.json({
        redirectUrl: newUrl,
        status: 301,
      });
    }

    return NextResponse.json({ redirectUrl: null });
  } catch (error) {
    console.error('Redirect lookup failed:', error);
    return NextResponse.json(
      { error: 'Redirect lookup failed' },
      { status: 500 }
    );
  }
}
