import { Suspense } from 'react';
import { MicrosoftAuthComplete } from './complete-client';

export default function MicrosoftAuthCompletePage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Completing Microsoft sign-in…</p>
      </main>
    }>
      <MicrosoftAuthComplete />
    </Suspense>
  );
}
