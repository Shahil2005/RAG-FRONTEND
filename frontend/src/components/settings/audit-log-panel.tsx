'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuditRow {
  id: string;
  action: string;
  resource_type: string | null;
  created_at: string;
  metadata: Record<string, unknown> | string | null;
}

export function AuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<AuditRow[]>('/audit/logs')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load audit logs'));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {error && <p className="text-red-500">{error}</p>}
        {!error && rows.length === 0 && (
          <p className="text-muted-foreground">No audit entries (admin/owner only).</p>
        )}
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="rounded border border-border/60 px-2 py-1.5 text-xs">
              <span className="font-medium">{r.action}</span>
              <span className="text-muted-foreground">
                {' '}
                · {new Date(r.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
