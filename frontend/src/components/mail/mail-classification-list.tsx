'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { EmailCategory, MailClassificationRow } from '@/types/starbot';

const CATEGORY_ORDER: EmailCategory[] = [
  'pending_action',
  'important',
  'closed',
  'spam',
  'sent',
];

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  pending_action: 'Pending action',
  important: 'Important',
  closed: 'Closed',
  spam: 'Spam',
  sent: 'Sent',
};

const CATEGORY_STYLES: Record<EmailCategory, string> = {
  pending_action: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  important: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  closed: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  spam: 'bg-muted text-muted-foreground border-border',
  sent: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const CATEGORY_DOT: Record<EmailCategory, string> = {
  pending_action: 'bg-blue-400',
  important: 'bg-amber-400',
  closed: 'bg-emerald-400',
  spam: 'bg-muted-foreground',
  sent: 'bg-violet-400',
};

function formatMailDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatConfidence(value: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return `${pct}%`;
}

function groupByCategory(items: MailClassificationRow[]): Map<EmailCategory, MailClassificationRow[]> {
  const map = new Map<EmailCategory, MailClassificationRow[]>();
  for (const cat of CATEGORY_ORDER) {
    map.set(cat, []);
  }
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}

function MailCard({
  item,
  selectable,
  selected,
  onToggle,
}: {
  item: MailClassificationRow;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const meta = item.email_metadata;
  const style = CATEGORY_STYLES[item.category];
  const isSent = item.category === 'sent';

  return (
    <article
      className={cn(
        'surface-card rounded-xl border bg-card p-4 shadow-soft transition-[border-color,box-shadow,transform] duration-fast ease-out',
        selected
          ? 'border-primary/60 ring-1 ring-primary/40'
          : 'border-border/80 hover:border-border',
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
            aria-label={`Select email: ${meta.subject || 'no subject'}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[item.category]}`} />
              {CATEGORY_LABELS[item.category]}
            </span>
            {!isSent && (
              <span className="text-xs text-muted-foreground">
                Confidence: {formatConfidence(Number(item.confidence))}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-base font-semibold leading-snug text-foreground">
            {meta.subject || '(no subject)'}
          </h3>

          <dl className="mt-2 grid gap-1 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-x-4">
              <dt className="sr-only">{isSent ? 'To' : 'From'}</dt>
              <dd>
                <span className="font-medium text-foreground/80">
                  {isSent ? 'To:' : 'From:'}
                </span>{' '}
                {meta.sender}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Received</dt>
              <dd>
                <span className="font-medium text-foreground/80">Date:</span>{' '}
                {formatMailDate(meta.received_at)}
              </dd>
            </div>
          </dl>

          {item.reasoning && (
            <div className="mt-3 border-t border-border/60 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Why
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{item.reasoning}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

interface GeneratedReply {
  id: string;
  subject: string;
  sender: string;
  reply: string;
}

interface MailClassificationListProps {
  items: MailClassificationRow[];
  /** When provided, enables multi-select + delete. Receives the selected classification ids. */
  onDelete?: (ids: string[]) => Promise<void>;
  /** When provided (with onSaveDrafts), enables generating AI replies for selected emails. */
  onGenerateReplies?: (
    ids: string[],
  ) => Promise<{ replies: GeneratedReply[]; failed: string[] }>;
  /** Saves the reviewed replies as Outlook drafts. */
  onSaveDrafts?: (
    items: { id: string; reply: string }[],
  ) => Promise<{ created: number; failed: string[] }>;
}

export function MailClassificationList({
  items,
  onDelete,
  onGenerateReplies,
  onSaveDrafts,
}: MailClassificationListProps) {
  const [active, setActive] = useState<EmailCategory>(CATEGORY_ORDER[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [draftReplies, setDraftReplies] = useState<GeneratedReply[]>([]);
  const [draftResult, setDraftResult] = useState<{ created: number; failed: number } | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Lock scroll + allow Escape to close whichever dialog is open.
  useEffect(() => {
    if (!confirmOpen && !replyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmOpen && !deleting) setConfirmOpen(false);
      if (replyOpen && !savingDrafts) {
        setReplyOpen(false);
        setDraftReplies([]);
        setDraftResult(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [confirmOpen, replyOpen, deleting, savingDrafts]);

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No classifications yet. Click <strong>Classify inbox</strong> to analyze your recent Outlook
        messages.
      </p>
    );
  }

  const grouped = groupByCategory(items);
  const activeItems = grouped.get(active) ?? [];
  const selectable = Boolean(onDelete);
  const replyable = Boolean(onGenerateReplies && onSaveDrafts);
  const selectedCount = selected.size;
  const allSelected =
    activeItems.length > 0 && activeItems.every((i) => selected.has(i.id));

  function switchTab(category: EmailCategory) {
    setActive(category);
    setSelected(new Set()); // selection is scoped to the visible tab
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(activeItems.map((i) => i.id)));
  }

  async function confirmDelete() {
    if (!onDelete || selectedCount === 0) return;
    setDeleting(true);
    try {
      await onDelete([...selected]);
      setSelected(new Set());
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleReplyClick() {
    if (!onGenerateReplies || selectedCount === 0) return;
    setGenerating(true);
    setReplyError(null);
    try {
      const res = await onGenerateReplies([...selected]);
      if (res.replies.length === 0) {
        setReplyError('Could not generate any replies. Please try again.');
        return;
      }
      setDraftReplies(res.replies);
      setDraftResult(null);
      setReplyOpen(true);
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : 'Reply generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  function updateReply(id: string, text: string) {
    setDraftReplies((prev) => prev.map((r) => (r.id === id ? { ...r, reply: text } : r)));
  }

  function removeReply(id: string) {
    setDraftReplies((prev) => prev.filter((r) => r.id !== id));
  }

  function closeReply() {
    setReplyOpen(false);
    setDraftReplies([]);
    setDraftResult(null);
    setSelected(new Set());
  }

  async function saveDrafts() {
    if (!onSaveDrafts) return;
    const payload = draftReplies
      .filter((r) => r.reply.trim())
      .map((r) => ({ id: r.id, reply: r.reply }));
    if (payload.length === 0) return;
    setSavingDrafts(true);
    setReplyError(null);
    try {
      const res = await onSaveDrafts(payload);
      setDraftResult({ created: res.created, failed: res.failed.length });
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : 'Saving drafts failed.');
    } finally {
      setSavingDrafts(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Mail status"
        className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-surface/40 p-1"
      >
        {CATEGORY_ORDER.map((category) => {
          const count = grouped.get(category)?.length ?? 0;
          const isActive = category === active;
          return (
            <button
              key={category}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => switchTab(category)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-fast ease-out',
                isActive
                  ? 'bg-muted text-foreground shadow-soft'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              {CATEGORY_LABELS[category]}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selection toolbar */}
      {(selectable || replyable) && activeItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface/40 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
              aria-label="Select all emails in this tab"
            />
            {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
          </label>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              {replyable && active !== 'sent' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplyClick}
                  disabled={generating || deleting}
                  className="gap-1.5"
                >
                  {generating ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 17l-5-5 5-5M4 12h11a4 4 0 0 1 4 4v2" />
                      </svg>
                      Reply {selectedCount}
                    </>
                  )}
                </Button>
              )}
              {selectable && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={generating}
                  className="gap-1.5"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                  </svg>
                  Delete {selectedCount}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {replyError && !replyOpen && (
        <p className="text-sm text-destructive">{replyError}</p>
      )}

      {activeItems.length ? (
        <ul className="space-y-3">
          {activeItems.map((item, index) => (
            <li
              key={item.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
            >
              <MailCard
                item={item}
                selectable={selectable}
                selected={selected.has(item.id)}
                onToggle={() => toggle(item.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {CATEGORY_LABELS[active].toLowerCase()} mail.
        </p>
      )}

      {/* Reply review / edit dialog */}
      {replyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
            aria-label="Close replies"
            onClick={() => !savingDrafts && closeReply()}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reply-title"
            className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col animate-scale-in overflow-hidden rounded-2xl border border-border/80 bg-popover shadow-pop"
          >
            {draftResult ? (
              <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold text-foreground">
                    {draftResult.created} draft{draftResult.created === 1 ? '' : 's'} saved to Outlook
                  </h2>
                  <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Open Outlook → <span className="font-medium text-foreground">Drafts</span> to
                    review and send {draftResult.created === 1 ? 'it' : 'them'}.
                    {draftResult.failed > 0 &&
                      ` ${draftResult.failed} could not be saved.`}
                  </p>
                </div>
                <Button onClick={closeReply}>Done</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
                  <div className="min-w-0">
                    <h2 id="reply-title" className="text-lg font-semibold text-foreground">
                      Review replies
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Edit as needed, then save to your Outlook Drafts.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {draftReplies.length}
                  </span>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  {draftReplies.map((r, index) => (
                    <div
                      key={r.id}
                      className="animate-fade-up rounded-xl border border-border/70 bg-surface/40 p-3"
                      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {r.subject || '(no subject)'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">To: {r.sender}</p>
                        </div>
                        {draftReplies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReply(r.id)}
                            className="shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={`Remove reply to ${r.sender}`}
                            title="Remove from batch"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <textarea
                        value={r.reply}
                        onChange={(e) => updateReply(r.id, e.target.value)}
                        rows={6}
                        className="w-full resize-y rounded-lg border border-border bg-background/60 px-3 py-2 text-sm leading-relaxed text-foreground transition-colors focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                      />
                    </div>
                  ))}
                  {replyError && <p className="text-sm text-destructive">{replyError}</p>}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/70 px-6 py-4">
                  <p className="hidden text-[11px] text-muted-foreground/70 sm:block">
                    Saved to Outlook Drafts. Nothing is sent.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={closeReply} disabled={savingDrafts}>
                      Cancel
                    </Button>
                    <Button
                      onClick={saveDrafts}
                      disabled={savingDrafts || draftReplies.every((r) => !r.reply.trim())}
                    >
                      {savingDrafts ? 'Saving…' : `Save ${draftReplies.length} to Drafts`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
            aria-label="Cancel deletion"
            onClick={() => !deleting && setConfirmOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            className="relative z-10 w-full max-w-md animate-scale-in rounded-2xl border border-border/80 bg-popover p-6 shadow-pop"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 id="confirm-delete-title" className="text-lg font-semibold text-foreground">
                  Delete {selectedCount} email{selectedCount === 1 ? '' : 's'}?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {selectedCount === 1 ? 'This email' : `These ${selectedCount} emails`} will be
                  deleted from your Outlook mailbox and moved to{' '}
                  <span className="font-medium text-foreground">Deleted Items</span>. You can still
                  recover {selectedCount === 1 ? 'it' : 'them'} from Outlook.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : `Delete ${selectedCount}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
