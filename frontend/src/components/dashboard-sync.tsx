'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';

/**
 * Triggers mailbox indexing once per browser session (client-side only).
 * Avoids heavy embed/sync work during Next.js SSR, which caused memory errors.
 */
export function DashboardSync() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void apiFetch('/ingestion/outlook/sync', { method: 'POST' }).catch(() => {
      /* best-effort background mail indexing */
    });
    void apiFetch('/ingestion/documents/sync', { method: 'POST' }).catch(() => {
      /* best-effort SharePoint / OneDrive indexing */
    });
  }, []);

  return null;
}
