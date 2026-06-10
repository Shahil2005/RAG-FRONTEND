import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'starbot_session';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // OAuth and API routes must not be blocked (proxied to NestJS)
  if (path.startsWith('/api/v1')) {
    return NextResponse.next();
  }

  const isPublic =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/auth/microsoft');

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && !isPublic && !path.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
