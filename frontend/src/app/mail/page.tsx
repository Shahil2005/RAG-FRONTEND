'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppNav } from '@/components/layout/app-nav';
import { apiFetch } from '@/lib/api';
import { MailClassificationList } from '@/components/mail/mail-classification-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MailClassificationRow } from '@/types/starbot';

export default function MailPage() {
  const [items, setItems] = useState<MailClassificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClassifications = useCallback(async () => {
    const data = await apiFetch<MailClassificationRow[]>('/mail/classifications');
    setItems(data);
  }, []);

  useEffect(() => {
    void loadClassifications().catch(() => {
      /* empty until first classify */
    });
  }, [loadClassifications]);

  async function classify() {
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/mail/classify', { method: 'POST' });
      await loadClassifications();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Classification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(ids: string[]) {
    setError(null);
    try {
      const result = await apiFetch<{ requested: number; deleted: number; failed: string[] }>(
        '/mail/classifications/delete',
        { method: 'POST', body: JSON.stringify({ ids }) },
      );
      await loadClassifications();
      if (result.failed.length > 0) {
        setError(
          `Deleted ${result.deleted} of ${result.requested}. ${result.failed.length} could not be deleted from Outlook.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      await loadClassifications();
    }
  }

  function generateReplies(ids: string[]) {
    return apiFetch<{
      replies: { id: string; subject: string; sender: string; reply: string }[];
      failed: string[];
    }>('/mail/reply/generate', { method: 'POST', body: JSON.stringify({ ids }) });
  }

  function saveReplyDrafts(replies: { id: string; reply: string }[]) {
    return apiFetch<{ created: number; failed: string[] }>('/mail/reply/draft', {
      method: 'POST',
      body: JSON.stringify({ items: replies }),
    });
  }

  return (
    <div className="min-h-screen">
      <AppNav />
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to chat
        </Link>
      </div>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Smart Mail Agent</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent messages grouped by priority. Run classify to refresh from Outlook.
            </p>
          </div>
          <Button onClick={classify} disabled={loading}>
            {loading ? 'Classifying…' : 'Classify inbox'}
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <MailClassificationList
            items={items}
            onDelete={handleDelete}
            onGenerateReplies={generateReplies}
            onSaveDrafts={saveReplyDrafts}
          />
        </CardContent>
      </Card>
    </main>
    </div>
  );
}
