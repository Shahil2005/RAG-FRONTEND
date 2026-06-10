import { NextResponse } from 'next/server';
import { logErrorFromUnknown } from '@/lib/logger';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, { cache: 'no-store' });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    logErrorFromUnknown('Health', 'API health proxy failed', err, { apiUrl: API_URL });
    return NextResponse.json(
      { status: 'error', message: `API unreachable at ${API_URL}` },
      { status: 503 },
    );
  }
}
