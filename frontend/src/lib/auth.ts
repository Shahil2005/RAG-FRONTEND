import { cookies } from 'next/headers';
import { logErrorFromUnknown, logWarn } from '@/lib/logger';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  organizationId?: string;
  role?: string;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  if (!cookieHeader) return null;

  const base =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001';

  try {
    const res = await fetch(`${base}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      if (res.status === 401) return null;
      logWarn('Auth', 'getCurrentUser: /auth/me returned non-OK', { status: res.status });
      return null;
    }
    return (await res.json()) as CurrentUser;
  } catch (err) {
    logErrorFromUnknown('Auth', 'getCurrentUser: request failed', err, { base });
    return null;
  }
}
