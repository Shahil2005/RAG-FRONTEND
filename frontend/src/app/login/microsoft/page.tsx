'use client';

import { useEffect, useState } from 'react';

/**
 * Popup entry: same-origin fetch to /api/v1/... (Next route proxies to Nest),
 * then full navigation to Microsoft login (account + consent screens).
 */
export default function MicrosoftLoginPopupPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startMicrosoftLogin() {
      try {
        const health = await fetch('/api/v1/health', { cache: 'no-store' });
        if (!health.ok) {
          throw new Error(
            'API is not running. From the repo root run: .\\run-dev.cmd',
          );
        }

        const res = await fetch('/api/v1/auth/microsoft/authorize-url?popup=1', {
          cache: 'no-store',
        });

        const body = await res.json().catch(() => ({})) as {
          authorizeUrl?: string;
          message?: string;
        };

        if (!res.ok) {
          throw new Error(
            body.message ??
              'Auth endpoint not found. Restart dev servers after pulling latest code.',
          );
        }

        if (!body.authorizeUrl) {
          throw new Error('Invalid response from auth server');
        }

        if (!cancelled) {
          window.location.href = body.authorizeUrl;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Microsoft sign-in failed to start');
        }
      }
    }

    startMicrosoftLogin();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-[520px] flex-col items-center justify-center gap-4 bg-[#f3f3f3] p-8">
      <div className="w-full max-w-sm rounded border border-[#e5e5e5] bg-white p-8 shadow-sm">
        {!error ? (
          <>
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center">
              <svg className="h-8 w-8" viewBox="0 0 21 21" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
            </div>
            <p className="text-center text-sm font-medium text-[#1b1b1b]">
              Redirecting to Microsoft
            </p>
            <p className="mt-2 text-center text-xs text-[#605e5c]">
              Sign in with your work or school account and accept the requested permissions.
            </p>
            <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-[#0078d4] border-t-transparent" />
          </>
        ) : (
          <>
            <p className="text-center text-sm font-medium text-red-600">Sign-in could not start</p>
            <p className="mt-2 text-center text-xs text-[#605e5c]">{error}</p>
            <button
              type="button"
              className="mt-4 w-full rounded bg-[#0078d4] px-4 py-2 text-sm text-white hover:bg-[#106ebe]"
              onClick={() => window.close()}
            >
              Close
            </button>
          </>
        )}
      </div>
    </main>
  );
}
