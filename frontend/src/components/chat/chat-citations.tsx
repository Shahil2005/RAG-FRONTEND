'use client';

import { useId, useState } from 'react';
import type { Citation } from '@/types/starbot';
import { Button } from '@/components/ui/button';

function formatCitationDate(timestamp?: string): string | null {
  if (!timestamp) return null;
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function sourceCountLabel(count: number): string {
  return count === 1 ? '1 source' : `${count} sources`;
}

/** React list key — internal and external citations both use index 1..n separately. */
function citationListKey(c: Citation, position: number): string {
  return `${c.source}:${c.index}:${position}:${c.url ?? ''}:${c.title}`;
}

interface ChatCitationsProps {
  citations: Citation[];
}

export function ChatCitations({ citations }: ChatCitationsProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  if (!citations.length) return null;

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? 'Hide sources' : 'Sources'}
        </Button>
        <span className="text-xs text-muted-foreground">{sourceCountLabel(citations.length)}</span>
      </div>
      {open && (
        <ol id={listId} className="mt-2 space-y-2">
          {citations.map((c, position) => {
            const date = formatCitationDate(c.timestamp);
            return (
              <li
                key={citationListKey(c, position)}
                className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-border"
              >
                <span className="mr-1 inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">
                  {c.source === 'external' ? `EXT-${c.index}` : c.index}
                </span>{' '}
                {c.url ? (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline-offset-2 hover:underline"
                  >
                    {c.title}
                  </a>
                ) : (
                  <span className="text-foreground">{c.title}</span>
                )}
                <span className="text-muted-foreground"> · {c.source}</span>
                {date && <span className="text-muted-foreground"> · {date}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
