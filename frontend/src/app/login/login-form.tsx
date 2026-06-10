'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { logError, logErrorFromUnknown, logInfo, logWarn } from '@/lib/logger';

const REDIRECT_URI = 'http://localhost:3000/api/v1/auth/microsoft/callback';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_client_secret:
    'Azure client secret is wrong: apps/api/.env has the Secret ID (UUID), not the Secret Value. In Microsoft Entra → star-bot → Certificates & secrets → create a new client secret → copy the Value (shown once) into AZURE_CLIENT_SECRET, then restart run-dev.cmd.',
  admin_consent:
    'Your tenant admin must grant consent for Mail, Files, and Sites permissions on the star-bot app (API permissions → Grant admin consent).',
  access_denied:
    'Sign-in was cancelled or blocked. If you saw "Need admin approval", ask your IT admin to grant consent for star-bot.',
  invalid_state:
    'Sign-in session expired. Click Continue with Microsoft again.',
  missing_code:
    'Microsoft did not return an authorization code. Check the Entra redirect URI matches exactly: ' +
    REDIRECT_URI,
  token_exchange:
    'Microsoft token exchange failed. Verify AZURE_CLIENT_ID, AZURE_CLIENT_SECRET (Value), and AZURE_TENANT_ID in apps/api/.env.',
  login_start_failed:
    'Could not start Microsoft login. Ensure the API is running (run-dev.cmd) and Azure variables are set in apps/api/.env.',
  api_unreachable:
    'Could not reach the API during sign-in. Start run-dev.cmd and confirm http://localhost:3001/api/v1/health works.',
};

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const oauthError = params.get('error');
  const reason = params.get('reason');
  const [error, setError] = useState('');

  useEffect(() => {
    if (oauthError !== 'oauth') return;

    if (reason && OAUTH_ERROR_MESSAGES[reason]) {
      logError('Login', 'Microsoft sign-in returned to login with error', { reason });
      setError(OAUTH_ERROR_MESSAGES[reason]);
      return;
    }

    logWarn('Login', 'Microsoft sign-in failed without a specific reason', { reason });
    setError(
      'Microsoft sign-in did not complete. Check API (run-dev.cmd), Entra redirect URI, and admin consent.',
    );
  }, [oauthError, reason]);

  useEffect(() => {
    fetch('/api/v1/health', { cache: 'no-store' })
      .then((r) => r.json())
      .then((h: { azureSecretMisconfigured?: boolean }) => {
        if (h.azureSecretMisconfigured && !oauthError) {
          logWarn('Login', 'API health reports misconfigured Azure client secret');
          setError(OAUTH_ERROR_MESSAGES.invalid_client_secret);
        }
      })
      .catch((err) => {
        logErrorFromUnknown('Login', 'Health check failed — is the API running?', err);
      });
  }, [oauthError]);

  function signInWithMicrosoft() {
    setError('');
    logInfo('Login', 'Starting Microsoft sign-in redirect');
    window.location.href = '/api/v1/auth/microsoft/login';
  }

  return (
    <div className="relative w-full max-w-md animate-fade-up">
      {/* Ambient glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 -z-10 opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(220px circle at 50% 0%, hsl(var(--primary) / 0.35), transparent 70%)',
        }}
      />
      <Card className="w-full shadow-pop">
        <CardContent className="space-y-7 p-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <Logo size={56} subtitle="Enterprise AI" />
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-gradient">Welcome back</h1>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                Sign in with your Microsoft work account to access your Outlook, SharePoint,
                and OneDrive knowledge.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2.5 bg-surface text-sm"
            onClick={signInWithMicrosoft}
          >
            <MicrosoftIcon />
            Continue with Microsoft
          </Button>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive-foreground">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
            <span className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              Secured by Microsoft Entra ID
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
