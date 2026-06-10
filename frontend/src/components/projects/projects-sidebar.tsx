'use client';

import type { ProjectSummary } from '@/types/starbot';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectsSidebarProps {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onNewProject: () => void;
  onEditProject?: () => void;
  creatingProject?: boolean;
}

export function ProjectsSidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onEditProject,
  creatingProject,
}: ProjectsSidebarProps) {
  return (
    <aside className="flex h-full w-52 shrink-0 flex-col overflow-hidden border-r border-border bg-card/50">
      <div className="shrink-0 border-b border-border p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Projects
        </p>
        <Button
          className="mt-2 w-full"
          variant="outline"
          size="sm"
          onClick={onNewProject}
          disabled={creatingProject}
        >
          {creatingProject ? 'Creating…' : '+ New project'}
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <button
          type="button"
          onClick={() => onSelectProject(null)}
          className={cn(
            'mb-1 w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
            activeProjectId === null
              ? 'bg-primary/15 font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          General
        </button>
        {projects.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">No projects yet</p>
        ) : (
          <ul className="space-y-0.5">
            {projects.map((project) => {
              const active = project.id === activeProjectId;
              return (
                <li key={project.id}>
                  <div
                    className={cn(
                      'flex items-center gap-1 rounded-md pr-1',
                      active && 'bg-primary/15',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                      className={cn(
                        'min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        active
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <span className="line-clamp-2 leading-snug">{project.name}</span>
                    </button>
                    {active && onEditProject && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProject();
                        }}
                        aria-label={`Edit ${project.name} settings`}
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
      </nav>
    </aside>
  );
}
