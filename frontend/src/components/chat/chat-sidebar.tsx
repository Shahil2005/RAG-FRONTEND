'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ChatSessionSummary, ProjectSummary } from '@/types/starbot';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatSessionDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function initials(name?: string | null, email?: string): string {
  const source = (name && name.trim()) || email || '?';
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (letters || source[0] || '?').toUpperCase();
}

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 opacity-80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const FOOTER_LINKS = [
  { href: '/dashboard', label: 'Chat', path: 'M21 11.5a8.4 8.4 0 0 1-12 7.6L3 21l1.9-6A8.4 8.4 0 1 1 21 11.5z' },
  { href: '/mail', label: 'Smart Mail', path: 'M4 5h16v14H4zM4 6l8 6 8-6' },
  { href: '/settings', label: 'Settings', path: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 2h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z' },
];

interface ChatSidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  creatingChat?: boolean;
  projects: ProjectSummary[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onNewProject: () => void;
  creatingProject?: boolean;
  userEmail?: string;
  userName?: string | null;
  onEditProject?: () => void;
  projectSettingsOpen?: boolean;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  creatingChat,
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  creatingProject,
  userEmail,
  userName,
  onEditProject,
  projectSettingsOpen,
}: ChatSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-black/40">
      {/* User identity */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border/70 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/15">
          {initials(userName, userEmail)}
        </span>
        <div className="min-w-0">
          {userName && (
            <p className="truncate text-sm font-medium text-foreground">{userName}</p>
          )}
          {userEmail && (
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3">
        <Button className="w-full gap-1.5" onClick={onNewChat} disabled={creatingChat}>
          {creatingChat ? (
            'Creating…'
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New chat
            </>
          )}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {/* Projects section */}
        <section className="mb-4">
          <div className="flex items-center justify-between px-1.5 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Projects
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onNewProject}
              disabled={creatingProject}
              aria-label="New project"
            >
              {creatingProject ? '…' : '+ New'}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => onSelectProject(null)}
            className={cn(
              'mb-0.5 mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              activeProjectId === null
                ? 'bg-primary/15 font-medium text-foreground ring-1 ring-inset ring-primary/25'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Icon path="M3 12l9-9 9 9M5 10v10h14V10" />
            General
          </button>

          {projects.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground/80">No projects yet</p>
          ) : (
            <ul className="space-y-0.5">
              {projects.map((project) => {
                const active = project.id === activeProjectId;
                return (
                  <li key={project.id}>
                    <div
                      className={cn(
                        'flex items-center gap-1 rounded-lg pr-1 transition-colors',
                        active && 'bg-primary/15 ring-1 ring-inset ring-primary/25',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        className={cn(
                          'min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          active
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                      >
                        <span className="line-clamp-2 leading-snug">{project.name}</span>
                      </button>
                      {active && onEditProject && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProject();
                          }}
                          aria-label={`Edit ${project.name} settings`}
                          aria-expanded={projectSettingsOpen ?? false}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Chats section */}
        <nav>
          <p className="px-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Chats
          </p>
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground/80">No chats yet</p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((session) => {
                const active = session.id === activeSessionId;
                return (
                  <li key={session.id}>
                    <div
                      className={cn(
                        'group relative flex items-center gap-1 rounded-lg pr-1 transition-colors',
                        active
                          ? 'bg-muted/80 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left text-sm"
                      >
                        <span className="line-clamp-2 font-medium leading-snug">
                          {session.title || 'New chat'}
                        </span>
                        <span className="mt-0.5 block text-xs opacity-60">
                          {formatSessionDate(session.updated_at)}
                        </span>
                      </button>
                      {onDeleteSession && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className={cn(
                            'shrink-0 rounded-md p-1.5 text-muted-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:opacity-100',
                            'opacity-0 group-hover:opacity-100',
                            active && 'opacity-100',
                          )}
                          aria-label={`Delete ${session.title || 'chat'}`}
                          title="Delete chat"
                        >
                          <Icon path="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-border/70 p-3 text-sm">
        {FOOTER_LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
                active
                  ? 'bg-primary/15 font-medium text-foreground ring-1 ring-inset ring-primary/25'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon path={link.path} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
