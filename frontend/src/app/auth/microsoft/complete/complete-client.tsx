'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { logInfo } from '@/lib/logger';

const AUTH_MESSAGE_SUCCESS = 'STARBOT_AUTH_SUCCESS';
const AUTH_MESSAGE_ERROR = 'STARBOT_AUTH_ERROR';

export function MicrosoftAuthComplete() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'working' | 'done'>('working');

  useEffect(() => {
    const hasError = params.get('error') === 'oauth';
    const origin = window.location.origin;
    const payload = hasError
      ? { type: AUTH_MESSAGE_ERROR }
      : { type: AUTH_MESSAGE_SUCCESS };

    if (window.opener && !window.opener.closed) {
      logInfo('OAuthComplete', 'Notifying opener via postMessage', { hasError });
      window.opener.postMessage(payload, origin);
      setStatus('done');
      window.setTimeout(() => window.close(), 300);
      return;
    }

    logInfo('OAuthComplete', 'Redirecting after popup flow', {
      hasError,
      target: hasError ? '/login' : '/dashboard',
    });
    window.location.replace(hasError ? '/login?error=oauth' : '/dashboard');
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">
        {status === 'working' ? 'Completing Microsoft sign-in…' : 'Closing window…'}
      </p>
    </main>
  );
}
