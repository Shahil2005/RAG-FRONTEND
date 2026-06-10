'use client';

import { useEffect } from 'react';
import { ProjectSettingsPanel } from './project-settings-panel';

interface ProjectSettingsModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onProjectUpdated?: () => void;
  onProjectDeleted?: () => void;
}

export function ProjectSettingsModal({
  open,
  projectId,
  onClose,
  onProjectUpdated,
  onProjectDeleted,
}: ProjectSettingsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        aria-label="Close project settings"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl animate-scale-in overflow-y-auto rounded-2xl border border-border/80 bg-popover shadow-pop"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <ProjectSettingsPanel
          projectId={projectId}
          variant="modal"
          onProjectUpdated={onProjectUpdated}
          onProjectDeleted={onProjectDeleted}
          onClose={onClose}
          onSaved={onClose}
        />
      </div>
    </div>
  );
}
