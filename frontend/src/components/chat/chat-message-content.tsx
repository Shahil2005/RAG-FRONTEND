'use client';

import { formatMarkdownToReact } from '@/lib/format-markdown';

interface ChatMessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

export function ChatMessageContent({ content, role }: ChatMessageContentProps) {
  if (role === 'user') {
    return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  return <div className="text-sm leading-relaxed">{formatMarkdownToReact(content)}</div>;
}
