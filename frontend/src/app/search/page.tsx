'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatCitations } from '@/components/chat/chat-citations';
import { ChatMessageContent } from '@/components/chat/chat-message-content';
import type { UnifiedSearchResponse, VectorSource } from '@/types/starbot';

const SOURCE_OPTIONS: { id: VectorSource; label: string }[] = [
  { id: 'outlook', label: 'Outlook' },
  { id: 'sharepoint', label: 'SharePoint' },
  { id: 'onedrive', label: 'OneDrive' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<VectorSource[]>([
    'outlook',
    'sharepoint',
    'onedrive',
  ]);
  const [result, setResult] = useState<UnifiedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSource(source: VectorSource) {
    setSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    );
  }

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch<UnifiedSearchResponse>('/search/unified', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), sources, topK: 8 }),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gradient">Unified search</h1>
        <p className="text-sm text-muted-foreground">
          Search your indexed mail and documents, or run business research (industry
          benchmarks, vendor or company lookup, pricing references) when Tavily is
          configured.
        </p>
        <div className="flex flex-wrap gap-3">
          {SOURCE_OPTIONS.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sources.includes(s.id)}
                onChange={() => toggleSource(s.id)}
              />
              {s.label}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. industry average pricing, vendor research, or find a contract"
            onKeyDown={(e) => e.key === 'Enter' && void search()}
          />
          <Button onClick={search} disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              {result.usedExternalSearch && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Includes web research sources (business research).
                </p>
              )}
              <ChatMessageContent content={result.answer} role="assistant" />
              <ChatCitations citations={result.citations} />
              {result.externalResults && result.externalResults.length > 0 && (
                <div className="mt-3 border-t border-border/60 pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    External research
                  </p>
                  <ul className="space-y-1 text-xs">
                    {result.externalResults.map((e) => (
                      <li key={e.id}>
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {e.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
