'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogoMark } from '@/components/ui/logo';
import { apiFetch, downloadDocument } from '@/lib/api';
import type {
  ChatMessageRecord,
  Citation,
  DocumentDraft,
  RagQueryResponse,
} from '@/types/starbot';
import { ChatCitations } from './chat-citations';
import { ChatMessageContent } from './chat-message-content';

interface ChatMessage {
  role: string;
  content: string;
  citations?: Citation[];
  usedExternalSearch?: boolean;
  documentDraft?: DocumentDraft;
}

const SUGGESTIONS = [
  'Summarize my recent emails',
  'Draft an estimate for a new project',
  'What needs my action today?',
  '/document write a customer email',
];

interface SlashCommand {
  cmd: string;
  hint: string;
  /** True when the command expects text after it (insert + keep typing). */
  takesArgs: boolean;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/document', hint: 'Generate a document from a template', takesArgs: true },
  { cmd: '/pdf', hint: 'Export the last answer as PDF', takesArgs: false },
  { cmd: '/docx', hint: 'Export the last answer as Word', takesArgs: false },
];

/** Commands matching the input while it's a single `/token` (no space yet). */
function getSlashMatches(value: string): SlashCommand[] {
  const m = /^\/(\w*)$/.exec(value);
  if (!m) return [];
  const q = m[1].toLowerCase();
  return SLASH_COMMANDS.filter((c) => c.cmd.slice(1).toLowerCase().startsWith(q));
}

function parseCitations(raw: unknown): Citation[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw as Citation[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Citation[];
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function toChatMessages(rows: ChatMessageRecord[]): ChatMessage[] {
  return rows.map((row) => ({
    role: row.role,
    content: row.content,
    citations: parseCitations(row.citations),
  }));
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
          style={{ animation: 'typing-bounce 1.2s infinite', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function DraftActions({ draft }: { draft: DocumentDraft }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);
  const [downloadError, setDownloadError] = useState(false);

  async function save() {
    setState('saving');
    try {
      await apiFetch('/documents/draft-email', {
        method: 'POST',
        body: JSON.stringify({
          subject: draft.subject ?? draft.templateName,
          body: draft.body,
        }),
      });
      setState('saved');
    } catch {
      setState('error');
    }
  }

  async function download(format: 'pdf' | 'docx') {
    setDownloading(format);
    setDownloadError(false);
    try {
      await downloadDocument(draft.body, format, draft.templateName || 'document');
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => void download('docx')}
        disabled={downloading !== null}
      >
        {downloading === 'docx' ? 'Preparing…' : 'Download .docx'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void download('pdf')}
        disabled={downloading !== null}
      >
        {downloading === 'pdf' ? 'Preparing…' : 'Download .pdf'}
      </Button>
      {draft.canSaveToOutlook && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void save()}
          disabled={state === 'saving' || state === 'saved'}
        >
          {state === 'saving'
            ? 'Saving…'
            : state === 'saved'
              ? 'Saved to Outlook drafts'
              : 'Save to Outlook drafts'}
        </Button>
      )}
      {state === 'error' && (
        <span className="text-xs text-destructive">Couldn’t save — try again.</span>
      )}
      {downloadError && (
        <span className="text-xs text-destructive">Download failed — try again.</span>
      )}
    </div>
  );
}

/** Derive a filename from the answer's first non-empty line. */
function deriveFilename(text: string): string {
  const firstLine = text
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  const cleaned = (firstLine ?? 'document')
    .replace(/[#*_>`[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 60) || 'document';
}

interface ChatPanelProps {
  sessionId: string;
  sectorId?: string | null;
  onSessionActivity?: () => void;
}

export function ChatPanel({ sessionId, sectorId, onSessionActivity }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [commandNotice, setCommandNotice] = useState<string | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await apiFetch<ChatMessageRecord[]>(
        `/chat/sessions/${sessionId}/messages`,
      );
      setMessages(toChatMessages(rows));
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (loadingHistory) return;
    const id = requestAnimationFrame(() => scrollToBottom('auto'));
    return () => cancelAnimationFrame(id);
  }, [messages, loadingHistory, sessionId, scrollToBottom]);

  async function runExportCommand(format: 'pdf' | 'docx') {
    setInput('');
    const last = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.content.trim());
    if (!last) {
      setCommandNotice('Nothing to export yet — ask a question or generate a document first.');
      return;
    }
    // Prefer the clean generated body for doc-gen drafts; otherwise the answer text.
    const text = last.documentDraft?.body?.trim() || last.content;
    setCommandNotice(`Preparing .${format}…`);
    try {
      await downloadDocument(text, format, deriveFilename(text));
      setCommandNotice(`Downloaded the last answer as .${format}.`);
    } catch {
      setCommandNotice(`Couldn’t export to .${format} — try again.`);
    }
  }

  function selectSlash(c: SlashCommand) {
    setSlashOpen(false);
    if (c.takesArgs) {
      setInput(`${c.cmd} `);
    } else {
      setInput('');
      void send(c.cmd);
    }
  }

  async function send(textOverride?: string) {
    setSlashOpen(false);
    const raw = (textOverride ?? input).trim();

    // `/pdf` and `/docx` export the previous answer instead of sending a message.
    const exportCmd = /^\/(pdf|docx)\b/i.exec(raw);
    if (exportCmd) {
      await runExportCommand(exportCmd[1].toLowerCase() as 'pdf' | 'docx');
      return;
    }

    const query = raw;
    if (!query || loading) return;
    setCommandNotice(null);
    setLoading(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: query }]);
    setMessages((m) => [...m, { role: 'assistant', content: '' }]);

    const base =
      typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL ?? '')
        : 'http://localhost:3001';
    const url = base
      ? `${base}/api/v1/chat/sessions/${sessionId}/messages/stream`
      : `/api/v1/chat/sessions/${sessionId}/messages/stream`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: query, ...(sectorId ? { sectorId } : {}) }),
      });
      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      let citations: Citation[] | undefined;
      let emptyReason: RagQueryResponse['emptyReason'];
      let usedExternalSearch = false;
      let documentDraft: DocumentDraft | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          const event = JSON.parse(payload) as {
            type: string;
            data?: {
              text?: string;
              answer?: string;
              citations?: Citation[];
              emptyReason?: RagQueryResponse['emptyReason'];
              usedExternalSearch?: boolean;
              documentDraft?: DocumentDraft;
              message?: string;
            };
          };
          if (event.type === 'error') {
            throw new Error(event.data?.message ?? 'The assistant ran into an error.');
          }
          if (event.type === 'token' && event.data?.text) {
            answer += event.data.text;
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: 'assistant', content: answer };
              return copy;
            });
          }
          if (event.type === 'done' && event.data) {
            answer = event.data.answer ?? answer;
            citations = event.data.citations;
            emptyReason = event.data.emptyReason;
            usedExternalSearch = Boolean(event.data.usedExternalSearch);
            documentDraft = event.data.documentDraft;
          }
        }
      }

      let finalAnswer = answer;
      if (emptyReason === 'out_of_scope') {
        finalAnswer = `${answer}\n\n*(This question is outside AppXcess M365 scope.)*`;
      } else if (emptyReason === 'no_indexed_data') {
        finalAnswer = `${answer}\n\n*(No matching indexed data — try Settings sync.)*`;
      }

      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: finalAnswer,
          citations,
          usedExternalSearch,
          documentDraft,
        };
        return copy;
      });
      onSessionActivity?.();
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: `Error: ${e instanceof Error ? e.message : 'Unknown'}`,
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }

  const isEmpty = !loadingHistory && messages.length === 0;
  const slashMatches = getSlashMatches(input);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">

      <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading conversation…</p>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-6 py-20 text-center animate-fade-up">
              <LogoMark size={60} />
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-gradient">How can I help today?</h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                  Ask about your Outlook mail, SharePoint and OneDrive documents, workspace
                  knowledge, or business research like industry benchmarks and pricing.
                </p>
              </div>
              <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, index) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    disabled={loading}
                    style={{ animationDelay: `${100 + index * 50}ms` }}
                    className="group flex animate-fade-up items-center gap-2.5 rounded-xl border border-border/70 bg-surface/50 px-3.5 py-3 text-left text-[13px] text-muted-foreground transition-[transform,border-color,background-color,color] duration-fast ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const streaming = !isUser && loading && i === messages.length - 1 && !msg.content;

                if (isUser) {
                  return (
                    <div key={i} className="flex justify-end animate-fade-up">
                      <div className="max-w-[80%] rounded-3xl rounded-br-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
                        <ChatMessageContent content={msg.content} role="user" />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className="flex gap-3 animate-fade-up">
                    <LogoMark size={26} className="mt-0.5" />
                    <div className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                      {streaming ? (
                        <TypingDots />
                      ) : (
                        <ChatMessageContent content={msg.content} role="assistant" />
                      )}
                      {msg.usedExternalSearch && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                          </svg>
                          Includes web research
                        </p>
                      )}
                      {msg.citations && msg.citations.length > 0 && (
                        <ChatCitations citations={msg.citations} />
                      )}
                      {msg.documentDraft && (
                        <DraftActions draft={msg.documentDraft} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-5 pt-2 sm:px-6">
        <div className="mx-auto w-full max-w-4xl">
          {commandNotice && (
            <p className="mb-2 text-center text-[11px] text-muted-foreground">
              {commandNotice}
            </p>
          )}
          <div className="relative flex items-center gap-2 rounded-3xl border border-border bg-surface/70 p-2 pl-4 shadow-soft transition-[border-color,box-shadow] duration-fast ease-out focus-within:border-primary/40 focus-within:shadow-glow-sm">
            {slashOpen && slashMatches.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <p className="border-b border-border/60 px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Commands
                </p>
                {slashMatches.map((c, i) => (
                  <button
                    key={c.cmd}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSlash(c);
                    }}
                    onMouseEnter={() => setSlashIndex(i)}
                    className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${
                      i === slashIndex ? 'bg-muted/70' : 'hover:bg-muted/40'
                    }`}
                  >
                    <span className="font-medium text-foreground">{c.cmd}</span>
                    <span className="text-xs text-muted-foreground">{c.hint}</span>
                  </button>
                ))}
              </div>
            )}
            <Input
              placeholder="Ask anything, or type / for commands…"
              value={input}
              onChange={(e) => {
                const v = e.target.value;
                setInput(v);
                if (commandNotice) setCommandNotice(null);
                setSlashOpen(getSlashMatches(v).length > 0);
                setSlashIndex(0);
              }}
              onKeyDown={(e) => {
                if (slashOpen && slashMatches.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSlashIndex((i) => (i + 1) % slashMatches.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    selectSlash(slashMatches[slashIndex]);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSlashOpen(false);
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) send();
              }}
              onBlur={() => setSlashOpen(false)}
              disabled={loading || loadingHistory}
              className="h-10 flex-1 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0"
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              onClick={() => send()}
              disabled={loading || loadingHistory || !input.trim()}
              aria-label="Send message"
            >
              {loading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
            Starbot answers from your indexed Microsoft 365 data. Type /pdf or /docx to export the last answer.
          </p>
        </div>
      </div>
    </div>
  );
}
