'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, apiUpload } from '@/lib/api';
import type {
  ProjectDetail,
  ProjectFileSummary,
  ProjectSector,
} from '@/types/starbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProjectSettingsPanelProps {
  projectId: string;
  variant?: 'inline' | 'modal';
  onProjectUpdated?: () => void;
  onProjectDeleted?: () => void;
  onSaved?: () => void;
  onClose?: () => void;
}

export function ProjectSettingsPanel({
  projectId,
  variant = 'inline',
  onProjectUpdated,
  onProjectDeleted,
  onSaved,
  onClose,
}: ProjectSettingsPanelProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSector, setNewSector] = useState('');
  const [addingSector, setAddingSector] = useState(false);
  const [uploadSectorId, setUploadSectorId] = useState('');

  const loadProject = useCallback(async () => {
    const detail = await apiFetch<ProjectDetail>(`/projects/${projectId}`);
    setProject(detail);
    setName(detail.name);
    setDescription(detail.description ?? '');
    setInstructions(detail.custom_instructions ?? '');
  }, [projectId]);

  useEffect(() => {
    void loadProject().catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    });
  }, [loadProject]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          customInstructions: instructions.trim() || undefined,
        }),
      });
      await loadProject();
      onProjectUpdated?.();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        if (uploadSectorId) form.append('sectorId', uploadSectorId);
        await apiUpload<ProjectFileSummary>(`/projects/${projectId}/files`, form);
      }
      await loadProject();
      onProjectUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleAddSector() {
    const name = newSector.trim();
    if (!name) return;
    setAddingSector(true);
    setError(null);
    try {
      await apiFetch<ProjectSector>(`/projects/${projectId}/sectors`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewSector('');
      await loadProject();
      onProjectUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add sector');
    } finally {
      setAddingSector(false);
    }
  }

  async function handleDeleteSector(sectorId: string) {
    setError(null);
    try {
      await apiFetch(`/projects/${projectId}/sectors/${sectorId}`, { method: 'DELETE' });
      if (uploadSectorId === sectorId) setUploadSectorId('');
      await loadProject();
      onProjectUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete sector');
    }
  }

  async function handleAssignFileSector(fileId: string, sectorId: string) {
    setError(null);
    try {
      await apiFetch(`/projects/${projectId}/files/${fileId}/sector`, {
        method: 'PATCH',
        body: JSON.stringify({ sectorId: sectorId || null }),
      });
      await loadProject();
      onProjectUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reassign file');
    }
  }

  async function handleDeleteFile(fileId: string) {
    setError(null);
    try {
      await apiFetch(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE' });
      await loadProject();
      onProjectUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleDeleteProject() {
    if (!confirm('Delete this project and all its chats and files?')) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
      onProjectDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
    }
  }

  const wrapperClass =
    variant === 'modal'
      ? 'px-6 py-6'
      : 'shrink-0 border-b border-border bg-muted/20 px-4 py-4';

  if (!project) {
    return (
      <div className={`${wrapperClass} text-sm text-muted-foreground`}>
        Loading project…
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 id="project-settings-title" className="text-lg font-semibold">
            Project settings
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Back to chat
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete project'}
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Description</span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this project is about"
            />
          </label>
          <label className="block space-y-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Custom instructions</span>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-border bg-surface/60 px-3.5 py-2 text-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="How the assistant should behave in this project"
            />
          </label>
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save project'}
        </Button>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium">Sectors</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Group this project&apos;s knowledge into sectors. In chat, you can scope answers
            to a single sector.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {project.sectors.length === 0 ? (
              <span className="text-xs text-muted-foreground">No sectors yet</span>
            ) : (
              project.sectors.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
                >
                  {s.name}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDeleteSector(s.id)}
                    aria-label={`Delete sector ${s.name}`}
                    title="Delete sector"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddSector();
                }
              }}
              placeholder="New sector name (e.g. Finance)"
              className="h-9 max-w-xs"
              disabled={addingSector}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleAddSector()}
              disabled={addingSector || !newSector.trim()}
            >
              {addingSector ? 'Adding…' : 'Add sector'}
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium">Knowledge files</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Uploaded files are indexed and become this project&apos;s knowledge base.
            Assign each file to a sector to control what a sector-scoped chat can see.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {project.sectors.length > 0 && (
              <select
                value={uploadSectorId}
                onChange={(e) => setUploadSectorId(e.target.value)}
                disabled={uploading}
                className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                aria-label="Upload into sector"
              >
                <option value="">No sector</option>
                {project.sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <label className="cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted">
              {uploading ? 'Uploading…' : 'Upload files'}
              <input
                type="file"
                className="hidden"
                multiple
                accept=".txt,.md,.pdf,.docx,.xlsx,.pptx,.csv,.json"
                disabled={uploading}
                onChange={(e) => {
                  void handleUpload(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {project.files.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No files uploaded yet</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {project.files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.is_indexed ? 'Indexed' : f.index_reason ?? 'Not indexed'}
                      {f.chunk_count > 0 ? ` · ${f.chunk_count} chunks` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={f.sector_id ?? ''}
                      onChange={(e) => void handleAssignFileSector(f.id, e.target.value)}
                      className="h-8 max-w-[8rem] rounded-md border border-border bg-card px-2 text-xs"
                      aria-label={`Sector for ${f.file_name}`}
                    >
                      <option value="">No sector</option>
                      {project.sectors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline"
                      onClick={() => void handleDeleteFile(f.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
