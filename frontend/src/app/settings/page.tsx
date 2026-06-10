import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { serverApiFetch } from '@/lib/api-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IngestionSyncPanel } from '@/components/settings/ingestion-sync-panel';
import { AuditLogPanel } from '@/components/settings/audit-log-panel';
import { AppNav } from '@/components/layout/app-nav';
import type { IngestionStatus } from '@/types/starbot';
import { formatSyncIntervalMs } from '@/lib/format-sync-interval';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let connected = false;
  let ingestion: IngestionStatus | null = null;

  try {
    const status = await serverApiFetch<{ connected: boolean }>('/graph/status');
    connected = status.connected;
  } catch {
    connected = false;
  }

  try {
    ingestion = await serverApiFetch<IngestionStatus>('/ingestion/status');
  } catch {
    ingestion = null;
  }

  return (
    <div className="min-h-screen">
      <AppNav />
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Microsoft 365</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}. Mailbox and files are accessed using the permissions you
            granted at login.
          </p>
          <p className="text-sm">
            Status:{' '}
            <span className={connected ? 'text-green-500' : 'text-amber-500'}>
              {connected ? 'Connected' : 'Not connected — sign out and sign in again with Microsoft'}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pinecone index</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ingestion ? (
            <>
              <p>
                <span className="text-muted-foreground">Index:</span>{' '}
                <code className="rounded bg-muted px-1">{ingestion.pineconeIndexName}</code>
              </p>
              <p>
                <span className="text-muted-foreground">Namespace (org id):</span>{' '}
                <code className="break-all rounded bg-muted px-1 text-xs">
                  {ingestion.pineconeNamespace}
                </code>
              </p>
              <p>
                <span className="text-muted-foreground">Vectors in your namespace:</span>{' '}
                {ingestion.pineconeVectorCount ?? 'unknown'}
              </p>
              <p>
                <span className="text-muted-foreground">Emails in DB:</span>{' '}
                {ingestion.emailMetadataCount} ({ingestion.indexedEmailCount} indexed)
              </p>
              <p>
                <span className="text-muted-foreground">Documents in DB:</span>{' '}
                {ingestion.fileMetadataCount} ({ingestion.indexedFileCount} indexed)
              </p>
              <p>
                <span className="text-muted-foreground">AI embeddings service:</span>{' '}
                {ingestion.aiServiceReachable ? 'Running' : 'Not reachable — start ai-service on port 8001'}
              </p>
              {ingestion.lastOutlookSyncAt && (
                <p>
                  <span className="text-muted-foreground">Last mail sync:</span>{' '}
                  {new Date(ingestion.lastOutlookSyncAt).toLocaleString()}
                </p>
              )}
              {ingestion.lastDocumentsSyncAt && (
                <p>
                  <span className="text-muted-foreground">Last documents sync:</span>{' '}
                  {new Date(ingestion.lastDocumentsSyncAt).toLocaleString()}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Automatic background sync:</span>{' '}
                {ingestion.scheduledSyncEnabled ? (
                  <>
                    enabled (every {formatSyncIntervalMs(ingestion.scheduledSyncIntervalMs)}
                    {ingestion.estimatedNextScheduledSyncAt && (
                      <>
                        , next run about{' '}
                        {new Date(ingestion.estimatedNextScheduledSyncAt).toLocaleString()}
                      </>
                    )}
                    )
                  </>
                ) : (
                  <span className="text-amber-500">
                    off — set WORKER_SERVICE_TOKEN, start Redis, and run the Celery worker (
                    <code className="text-xs">cd backend &amp;&amp; celery -A app.core.celery.celery_app worker -B</code>)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Mail and documents also sync on Microsoft sign-in, first dashboard visit per session,
                and when you use Sync buttons below.
              </p>
              <IngestionSyncPanel initialStatus={ingestion} />
              <p className="text-xs text-muted-foreground">{ingestion.verification.checkNamespaceInPineconeConsole}</p>
              {(ingestion.pineconeVectorCount === 0 || ingestion.pineconeVectorCount === null) && (
                <p className="text-amber-500">
                  No vectors in Pinecone yet. Open the dashboard (triggers mail + document sync) or
                  use the sync button above. Vectors are stored under your org namespace, not
                  __default__.
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Could not load ingestion status. Is the API running?</p>
          )}
        </CardContent>
      </Card>

      <AuditLogPanel />
    </main>
    </div>
  );
}
