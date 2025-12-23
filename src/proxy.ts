import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Set pathname header for root layout to detect route groups
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);

  // Admin route protection:
  // - Fast check for presence of cookie
  // - For HTML navigations, also validate the session against DB via /api/admin/auth/me
  if (pathname.startsWith('/admin')) {
    const isLogin = pathname === '/admin/login';
    const isStatic = pathname.startsWith('/admin/_next');
    if (!isLogin && !isStatic) {
      const hasSession = Boolean(request.cookies.get('admin_session')?.value);
      if (!hasSession) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('next', pathname);
        return NextResponse.redirect(url);
      }

      // Only validate for document navigations to avoid extra overhead on assets.
      const accept = request.headers.get('accept') || '';
      const isDocument = accept.includes('text/html');
      if (isDocument) {
        try {
          const meUrl = new URL('/api/admin/auth/me', request.url);
          const cookieHeader = request.headers.get('cookie') || '';
          const meRes = await fetch(meUrl.toString(), {
            cache: 'no-store',
            headers: cookieHeader ? { cookie: cookieHeader } : {},
          });
          if (meRes.status === 401) {
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            url.searchParams.set('next', pathname);
            return NextResponse.redirect(url);
          }
        } catch {
          // If validation fails (e.g. dev), fall back to cookie presence.
        }
      }
    }
  }

  // Check for old URL patterns that need redirecting
  // Pattern: /show/{id}/{name}/index.html
  const oldUrlMatch = pathname.match(/^\/show\/(\d+)\/([^\/]+)\/index\.html$/i);
  
  if (oldUrlMatch) {
    try {
      const lookupUrl = new URL('/api/redirects', request.url);
      lookupUrl.searchParams.set('pathname', pathname);

      const redirectResponse = await fetch(lookupUrl.toString(), {
        cache: 'no-store',
        headers: { 'x-middleware-redirect-lookup': '1' },
      });

      if (redirectResponse.ok) {
        const data = await redirectResponse.json();
        if (data?.redirectUrl) {
          return NextResponse.redirect(
            new URL(data.redirectUrl, request.url),
            { status: data.status || 301 }
          );
        }
      }
    } catch (error) {
      console.error('Redirect lookup failed:', error);
      // Continue to normal request if redirect fails
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

