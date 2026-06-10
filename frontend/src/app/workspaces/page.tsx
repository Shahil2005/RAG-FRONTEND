'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  workspace_instructions: { instructions: string; version: number }[];
}

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await apiFetch<WorkspaceRow[]>('/workspaces');
        setWorkspaces(rows);
        const initial: Record<string, string> = {};
        for (const w of rows) {
          initial[w.id] = w.workspace_instructions[0]?.instructions ?? '';
        }
        setDrafts(initial);
      } catch {
        setAuthFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (authFailed) router.replace('/login');
  }, [authFailed, router]);

  async function save(workspaceId: string) {
    setSaving(workspaceId);
    try {
      await apiFetch(`/workspaces/${workspaceId}/instructions`, {
        method: 'PUT',
        body: JSON.stringify({ instructions: drafts[workspaceId] ?? '' }),
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl space-y-6 p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gradient">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          Department context used in chat when a session is linked to a workspace. Instructions are
          appended to RAG prompts.
        </p>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {workspaces.map((w) => (
          <Card key={w.id}>
            <CardHeader>
              <CardTitle>{w.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{w.description}</p>
              <Input
                value={drafts[w.id] ?? ''}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [w.id]: e.target.value }))
                }
                placeholder="Custom instructions for this workspace…"
              />
              <Button size="sm" onClick={() => save(w.id)} disabled={saving === w.id}>
                {saving === w.id ? 'Saving…' : 'Save instructions'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
