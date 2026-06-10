import { NextResponse } from 'next/server';
import { logError, logErrorFromUnknown, logInfo } from '@/lib/logger';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  const target = `${API_URL}/api/v1/auth/microsoft/login${search}`;

  logInfo('OAuthLogin', 'Proxying login redirect to API', { target });

  try {
    const res = await fetch(target, { redirect: 'manual', cache: 'no-store' });
    const location = res.headers.get('location');
    if (location) {
      logInfo('OAuthLogin', 'Redirecting browser to Microsoft', {
        status: res.status,
      });
      return NextResponse.redirect(location);
    }
    logError('OAuthLogin', 'API login did not return Location header', {
      status: res.status,
      apiUrl: API_URL,
    });
    return NextResponse.json(
      { message: 'Microsoft login did not return a redirect URL' },
      { status: 502 },
    );
  } catch (err) {
    logErrorFromUnknown('OAuthLogin', 'Cannot reach Starbot API', err, { apiUrl: API_URL });
    return NextResponse.json(
      { message: `Cannot reach Starbot API at ${API_URL}` },
      { status: 503 },
    );
  }
}
