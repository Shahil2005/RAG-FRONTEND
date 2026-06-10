'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { DocumentsSyncResult } from '@/types/starbot';

export function DocumentsSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DocumentsSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<DocumentsSyncResult>('/ingestion/documents/sync', {
        method: 'POST',
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={handleSync} disabled={loading}>
        {loading ? 'Syncing documents…' : 'Sync SharePoint & OneDrive now'}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && (
        <p className="text-xs text-muted-foreground">
          SharePoint: {result.sharepoint.indexed} indexed, {result.sharepoint.vectorsUpserted}{' '}
          vectors · OneDrive: {result.onedrive.indexed} indexed, {result.onedrive.vectorsUpserted}{' '}
          vectors
        </p>
      )}
    </div>
  );
}
