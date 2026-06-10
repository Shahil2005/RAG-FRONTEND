import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { serverApiFetch } from '@/lib/api-server';
import { describeSetupError } from '@/lib/setup-errors';
import { DashboardChatShell } from '@/components/chat/dashboard-chat-shell';
import type { ChatSessionSummary, ProjectSummary } from '@/types/starbot';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  let sessions: ChatSessionSummary[] = [];
  let projects: ProjectSummary[] = [];
  let setupError: string | null = null;

  const errors: string[] = [];

  try {
    sessions = await serverApiFetch<ChatSessionSummary[]>('/chat/sessions');
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  try {
    projects = await serverApiFetch<ProjectSummary[]>('/projects');
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  if (errors.length > 0) {
    setupError = describeSetupError(errors.join(' '));
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <DashboardChatShell
        userEmail={user.email}
        userName={user.name}
        initialSessions={sessions}
        initialProjects={projects}
        setupError={setupError}
      />
    </Suspense>
  );
}
