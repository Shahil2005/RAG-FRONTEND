import { cookies } from 'next/headers';
import { logError } from '@/lib/logger';

export async function serverApiFetch<T>(
  path: string,
  options?: RequestInit & { orgId?: string },
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const base =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:3001';
  const res = await fetch(`${base}/api/v1${path}`, {
    ...options,
    cache: 'no-store',
    signal: options?.signal ?? AbortSignal.timeout(15_000),
    headers: {
      'Content-Type': 'application/json',
      cookie: cookieHeader,
      ...(options?.orgId ? { 'x-organization-id': options.orgId } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logError('ApiServer', 'API request failed', {
      path,
      status: res.status,
      bodyPreview: text.slice(0, 200),
    });
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}
