'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { DocumentsSyncResult, IngestionStatus, OutlookSyncResult } from '@/types/starbot';

interface IngestionSyncPanelProps {
  initialStatus: IngestionStatus | null;
}

export function IngestionSyncPanel({ initialStatus }: IngestionSyncPanelProps) {
  const [status, setStatus] = useState<IngestionStatus | null>(initialStatus);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);
  const [outlookResult, setOutlookResult] = useState<OutlookSyncResult | null>(null);
  const [docsResult, setDocsResult] = useState<DocumentsSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    try {
      const s = await apiFetch<IngestionStatus>('/ingestion/status');
      setStatus(s);
    } catch {
      /* ignore */
    }
  }

  async function syncOutlook() {
    setOutlookLoading(true);
    setError(null);
    setOutlookResult(null);
    try {
      const data = await apiFetch<OutlookSyncResult>('/ingestion/outlook/sync', {
        method: 'POST',
      });
      setOutlookResult(data);
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Outlook sync failed');
      await refreshStatus();
    } finally {
      setOutlookLoading(false);
    }
  }

  async function syncDocuments() {
    setDocsLoading(true);
    setError(null);
    setDocsResult(null);
    try {
      const data = await apiFetch<DocumentsSyncResult>('/ingestion/documents/sync', {
        method: 'POST',
      });
      setDocsResult(data);
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Document sync failed');
      await refreshStatus();
    } finally {
      setDocsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {status?.lastOutlookSyncError && (
        <p className="text-sm text-red-500">Last mail sync error: {status.lastOutlookSyncError}</p>
      )}
      {status?.lastDocumentsSyncError && (
        <p className="text-sm text-red-500">
          Last documents sync error: {status.lastDocumentsSyncError}
        </p>
      )}
      {status && status.metadataOnlyFileCount > 0 && (
        <p className="text-sm text-amber-600">
          {status.metadataOnlyFileCount} file(s) indexed with metadata only (content not extracted).
          Supported: txt, md, pdf, docx, xlsx, pptx, and plain text types.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={syncOutlook}
          disabled={outlookLoading || docsLoading}
        >
          {outlookLoading ? 'Syncing mail…' : 'Sync Outlook now'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={syncDocuments}
          disabled={outlookLoading || docsLoading}
        >
          {docsLoading ? 'Syncing documents…' : 'Sync SharePoint & OneDrive'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {outlookResult && (
        <p className="text-xs text-muted-foreground">
          Mail: {outlookResult.indexed} indexed, {outlookResult.vectorsUpserted} vectors
        </p>
      )}
      {docsResult && (
        <p className="text-xs text-muted-foreground">
          SharePoint: {docsResult.sharepoint.indexed} indexed · OneDrive:{' '}
          {docsResult.onedrive.indexed} indexed
        </p>
      )}
    </div>
  );
}
