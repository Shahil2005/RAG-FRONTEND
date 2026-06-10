'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, downloadDocument } from '@/lib/api';
import { AppNav } from '@/components/layout/app-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type {
  DocumentTemplate,
  DocumentTemplateType,
  TemplateVariable,
} from '@/types/starbot';

const TYPE_OPTIONS: { value: DocumentTemplateType; label: string }[] = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'job_summary', label: 'Job summary' },
  { value: 'customer_email', label: 'Customer email' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'report', label: 'Report' },
];

function typeLabel(type: DocumentTemplateType): string {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

function emptyValues(vars: TemplateVariable[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of vars) out[v.key] = '';
  return out;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId),
    [templates, selectedId],
  );

  async function loadTemplates(selectId?: string) {
    const rows = await apiFetch<DocumentTemplate[]>('/documents/templates');
    setTemplates(rows);
    const pick = rows.find((r) => r.id === selectId) ?? rows[0];
    if (pick) {
      setSelectedId(pick.id);
      setVariables(emptyValues(pick.variables ?? []));
    }
  }

  useEffect(() => {
    void loadTemplates().catch(() => router.replace('/login'));
  }, [router]);

  function onSelectTemplate(id: string) {
    setSelectedId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setVariables(emptyValues(t.variables ?? []));
    setOutput(null);
  }

  async function generate() {
    if (!selectedId) return;
    setLoading(true);
    setOutput(null);
    try {
      const res = await apiFetch<{ content: string }>('/documents/generate', {
        method: 'POST',
        body: JSON.stringify({ templateId: selectedId, variables }),
      });
      setOutput(res.content);
    } catch (e) {
      setOutput(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-3xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-gradient">
            Document generation
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick a stored template and fill in the details, or just ask Starbot in chat —
          e.g. <em>“Draft an estimate for the Henderson kitchen remodel”</em>.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates yet. Create one below.
              </p>
            ) : (
              <>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedId}
                  onChange={(e) => onSelectTemplate(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {typeLabel(t.type)}
                    </option>
                  ))}
                </select>
                {(selected?.variables ?? []).map((v) => (
                  <div key={v.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {v.label}
                      {v.required ? ' *' : ''}
                    </label>
                    <Input
                      value={variables[v.key] ?? ''}
                      placeholder={v.example ?? ''}
                      onChange={(e) =>
                        setVariables((prev) => ({ ...prev, [v.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
                <Button onClick={generate} disabled={loading}>
                  {loading ? 'Generating…' : 'Generate document'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {output && (
          <Card>
            <CardHeader>
              <CardTitle>Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{output}</pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void navigator.clipboard.writeText(output)}
                >
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadDocument(output, 'docx', selected?.name ?? 'document')
                  }
                >
                  Download .docx
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void downloadDocument(output, 'pdf', selected?.name ?? 'document')
                  }
                >
                  Download .pdf
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <NewTemplateForm onCreated={(id) => void loadTemplates(id)} />
      </main>
    </div>
  );
}

function NewTemplateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<DocumentTemplateType>('estimate');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !content.trim()) {
      setError('Name and content are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<DocumentTemplate>('/documents/templates', {
        method: 'POST',
        body: JSON.stringify({ name, type, content }),
      });
      setName('');
      setContent('');
      setOpen(false);
      onCreated(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        + New template
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Type</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as DocumentTemplateType)}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Content — use {'{{placeholders}}'} for variables
          </label>
          <textarea
            className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'Hi {{customer_name}},\n\n{{body}}\n\nBest regards,\n{{sender_name}}'}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save template'}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
