import { NextResponse } from 'next/server';
import { logErrorFromUnknown, logWarn } from '@/lib/logger';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  const target = `${API_URL}/api/v1/auth/microsoft/authorize-url${search}`;

  try {
    const res = await fetch(target, { cache: 'no-store' });
    const body = await res.text();

    if (!res.ok) {
      logWarn('OAuthAuthorizeUrl', 'API authorize-url failed', { status: res.status, body });
      return new NextResponse(body, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logErrorFromUnknown('OAuthAuthorizeUrl', 'Cannot reach API', err, { apiUrl: API_URL });
    return NextResponse.json(
      {
        message: `Cannot reach Starbot API at ${API_URL}. Start it with run-dev.cmd from the repo root.`,
        error: 'Service Unavailable',
        statusCode: 503,
      },
      { status: 503 },
    );
  }
}
