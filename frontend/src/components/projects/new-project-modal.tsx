'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NewProjectModalProps {
  open: boolean;
  creating?: boolean;
  onClose: () => void;
  onCreate: (name: string) => void | Promise<void>;
}

export function NewProjectModal({ open, creating, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the field once the dialog is mounted.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  const trimmed = name.trim();

  function submit() {
    if (!trimmed || creating) return;
    void onCreate(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        aria-label="Close new project dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="relative z-10 w-full max-w-md animate-scale-in rounded-2xl border border-border/80 bg-popover shadow-pop"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-5 p-6"
        >
          <div className="space-y-1">
            <h2 id="new-project-title" className="text-lg font-semibold text-foreground">
              New project
            </h2>
            <p className="text-sm text-muted-foreground">
              Give your project a name. You can add knowledge and settings afterward.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="new-project-name" className="text-sm font-medium text-foreground">
              Project name
            </label>
            <Input
              id="new-project-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Marketing"
              maxLength={120}
              disabled={creating}
              autoComplete="off"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || creating}>
              {creating ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
