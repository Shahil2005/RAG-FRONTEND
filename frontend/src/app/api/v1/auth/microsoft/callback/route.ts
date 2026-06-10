import { NextResponse } from 'next/server';
import { logError, logErrorFromUnknown, logInfo, logWarn } from '@/lib/logger';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

/** Proxies OAuth callback so session cookie is set on the web origin (localhost:3000). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.search;
  const target = `${API_URL}/api/v1/auth/microsoft/callback${search}`;
  const microsoftError = url.searchParams.get('error');

  logInfo('OAuthCallback', 'Proxying Microsoft callback to API', {
    target,
    microsoftError: microsoftError ?? undefined,
    hasCode: url.searchParams.has('code'),
    hasState: url.searchParams.has('state'),
  });

  try {
    const res = await fetch(target, { redirect: 'manual', cache: 'no-store' });
    const location =
      res.headers.get('location') ??
      new URL('/login?error=oauth', request.url).toString();

    if (!res.ok && res.status !== 302 && res.status !== 307) {
      logError('OAuthCallback', 'API callback returned unexpected status', {
        status: res.status,
        location,
      });
    }

    const setCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [];
    if (setCookies.length === 0 && !res.headers.get('set-cookie')) {
      const redirectUrl = new URL(location, request.url);
      if (redirectUrl.pathname.includes('/dashboard')) {
        logWarn('OAuthCallback', 'No Set-Cookie header on successful-looking redirect', {
          location,
        });
      }
    } else {
      logInfo('OAuthCallback', 'Forwarding session cookie to browser', {
        cookieCount: setCookies.length || 1,
        redirectTo: location,
      });
    }

    const response = NextResponse.redirect(location);
    if (setCookies.length > 0) {
      for (const cookie of setCookies) {
        response.headers.append('Set-Cookie', cookie);
      }
    } else {
      const single = res.headers.get('set-cookie');
      if (single) response.headers.append('Set-Cookie', single);
    }

    return response;
  } catch (err) {
    logErrorFromUnknown('OAuthCallback', 'Failed to reach API for OAuth callback', err, {
      apiUrl: API_URL,
    });
    return NextResponse.redirect(
      new URL('/login?error=oauth&reason=api_unreachable', request.url),
    );
  }
}
