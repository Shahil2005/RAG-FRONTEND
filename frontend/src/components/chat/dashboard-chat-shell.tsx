'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { ChatSessionSummary, ProjectSector, ProjectSummary } from '@/types/starbot';
import { ChatPanel } from '@/components/chat/chat-panel';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { DashboardSync } from '@/components/dashboard-sync';
import { AppNav } from '@/components/layout/app-nav';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { ProjectSettingsModal } from '@/components/projects/project-settings-modal';
import { NewProjectModal } from '@/components/projects/new-project-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/ui/logo';

interface DashboardChatShellProps {
  userEmail: string;
  userName?: string | null;
  initialSessions: ChatSessionSummary[];
  initialProjects: ProjectSummary[];
  setupError?: string | null;
}

function buildDashboardUrl(projectId: string | null, sessionId?: string | null): string {
  const params = new URLSearchParams();
  if (projectId) params.set('project', projectId);
  if (sessionId) params.set('session', sessionId);
  const q = params.toString();
  return q ? `/dashboard?${q}` : '/dashboard';
}

export function DashboardChatShell({
  userEmail,
  userName,
  initialSessions,
  initialProjects,
  setupError,
}: DashboardChatShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>(initialSessions);
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [creatingChat, setCreatingChat] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [sectors, setSectors] = useState<ProjectSector[]>([]);
  const [activeSectorId, setActiveSectorId] = useState<string>('');

  const projectFromUrl = searchParams.get('project');
  const activeProjectId = projectFromUrl || null;

  const sessionFromUrl = searchParams.get('session');
  const activeSessionId =
    sessionFromUrl && sessions.some((s) => s.id === sessionFromUrl)
      ? sessionFromUrl
      : sessions[0]?.id ?? null;

  const sessionsPath = activeProjectId
    ? `/chat/sessions?projectId=${activeProjectId}`
    : '/chat/sessions';

  const refreshSessions = useCallback(async () => {
    const list = await apiFetch<ChatSessionSummary[]>(sessionsPath);
    setSessions(list);
    return list;
  }, [sessionsPath]);

  const refreshProjects = useCallback(async () => {
    const list = await apiFetch<ProjectSummary[]>('/projects');
    setProjects(list);
    return list;
  }, []);

  const refreshSectors = useCallback(async () => {
    if (!activeProjectId) {
      setSectors([]);
      return;
    }
    try {
      const list = await apiFetch<ProjectSector[]>(`/projects/${activeProjectId}/sectors`);
      setSectors(list);
    } catch {
      setSectors([]);
    }
  }, [activeProjectId]);

  // Load sectors when the active project changes; reset the active sector.
  useEffect(() => {
    setActiveSectorId('');
    void refreshSectors();
  }, [refreshSectors]);

  useEffect(() => {
    void refreshSessions().catch(() => undefined);
  }, [refreshSessions]);

  useEffect(() => {
    if (!projectFromUrl || projects.length === 0) return;
    if (!projects.some((p) => p.id === projectFromUrl)) {
      router.replace('/dashboard');
    }
  }, [projectFromUrl, projects, router]);

  useEffect(() => {
    if (!sessionFromUrl && sessions[0]?.id) {
      router.replace(buildDashboardUrl(activeProjectId, sessions[0].id));
    }
  }, [sessionFromUrl, sessions, router, activeProjectId]);

  async function handleNewChat() {
    setCreatingChat(true);
    try {
      const created = await apiFetch<ChatSessionSummary>('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New chat',
          ...(activeProjectId ? { projectId: activeProjectId } : {}),
        }),
      });
      setSessions((prev) => [created, ...prev]);
      router.push(buildDashboardUrl(activeProjectId, created.id));
    } finally {
      setCreatingChat(false);
    }
  }

  function handleNewProject() {
    setNewProjectOpen(true);
  }

  async function createProject(name: string) {
    setCreatingProject(true);
    try {
      const created = await apiFetch<ProjectSummary>('/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setProjects((prev) => [created, ...prev]);
      setSessions([]);
      setNewProjectOpen(false);
      setProjectSettingsOpen(true);
      router.push(buildDashboardUrl(created.id));
    } finally {
      setCreatingProject(false);
    }
  }

  function handleSelectProject(id: string | null) {
    setSessions([]);
    setProjectSettingsOpen(false);
    router.push(buildDashboardUrl(id));
  }

  function handleSelectSession(id: string) {
    router.push(buildDashboardUrl(activeProjectId, id));
  }

  async function handleDeleteSession(id: string) {
    if (!window.confirm('Delete this chat? This cannot be undone.')) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    try {
      await apiFetch(`/chat/sessions/${id}`, { method: 'DELETE' });
    } catch {
      // Roll back the optimistic removal if the API call fails.
      await refreshSessions();
      return;
    }
    if (id === activeSessionId) {
      router.replace(buildDashboardUrl(activeProjectId, remaining[0]?.id ?? null));
    }
  }

  async function handleAfterMessage() {
    const list = await refreshSessions();
    const current = sessionFromUrl ?? activeSessionId;
    if (current && !list.some((s) => s.id === current)) {
      router.replace(buildDashboardUrl(activeProjectId, list[0]?.id ?? null));
    }
  }

  function handleProjectDeleted() {
    void refreshProjects();
    router.push('/dashboard');
  }

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : undefined;

  const openProjectSettings = () => setProjectSettingsOpen(true);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppNav />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          creatingChat={creatingChat}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onNewProject={handleNewProject}
          creatingProject={creatingProject}
          userEmail={userEmail}
          userName={userName}
          onEditProject={activeProjectId ? openProjectSettings : undefined}
          projectSettingsOpen={projectSettingsOpen}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="glass flex shrink-0 items-center justify-between border-b border-border/70 px-6 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {activeProjectId ? 'Project' : 'Workspace'}
                </p>
                <h1 className="truncate text-lg font-semibold leading-tight">
                  {activeProject?.name ?? (activeProjectId ? 'Project' : 'General')}
                </h1>
              </div>
              {activeProjectId && sectors.length > 0 && (
                <select
                  value={activeSectorId}
                  onChange={(e) => setActiveSectorId(e.target.value)}
                  className="h-9 shrink-0 rounded-lg border border-border bg-surface/60 px-2.5 text-sm transition-colors hover:border-border focus-visible:border-primary/50 focus-visible:outline-none"
                  aria-label="Scope chat to sector"
                  title="Scope answers to a sector"
                >
                  <option value="">All sectors</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {activeProjectId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={openProjectSettings}
                  aria-expanded={projectSettingsOpen}
                  aria-label="Edit project settings"
                >
                  Edit
                </Button>
              )}
            </div>
            <SignOutButton />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {setupError ? (
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Setup required</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{setupError}</CardContent>
                </Card>
              </div>
            ) : activeSessionId ? (
              <>
                <DashboardSync />
                <ChatPanel
                  key={activeSessionId}
                  sessionId={activeSessionId}
                  sectorId={activeProjectId ? activeSectorId : null}
                  onSessionActivity={handleAfterMessage}
                />
              </>
            ) : (
              <Card className="m-6 flex flex-1 flex-col items-center justify-center overflow-hidden">
                <CardContent className="flex flex-col items-center gap-5 py-12 text-center animate-fade-up">
                  <LogoMark size={64} />
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-semibold text-gradient">
                      {activeProject ? activeProject.name : 'Start a conversation'}
                    </h2>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {activeProject
                        ? `Ask anything grounded in the ${activeProject.name} project knowledge.`
                        : 'Chat with Starbot across your Microsoft 365 mail and documents.'}
                    </p>
                  </div>
                  <Button onClick={handleNewChat} disabled={creatingChat} size="lg" className="gap-1.5">
                    {creatingChat ? 'Creating…' : '+ New chat'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>

      <NewProjectModal
        open={newProjectOpen}
        creating={creatingProject}
        onClose={() => setNewProjectOpen(false)}
        onCreate={createProject}
      />

      {activeProjectId && (
        <ProjectSettingsModal
          open={projectSettingsOpen}
          projectId={activeProjectId}
          onClose={() => setProjectSettingsOpen(false)}
          onProjectUpdated={() => {
            void refreshProjects();
            void refreshSectors();
          }}
          onProjectDeleted={handleProjectDeleted}
        />
      )}
    </div>
  );
}
