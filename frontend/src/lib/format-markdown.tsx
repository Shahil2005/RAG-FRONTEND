import type { ReactNode } from 'react';

function parseInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      <strong key={key++} className="font-semibold text-foreground">
        {match[1]}
      </strong>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length ? parts : [text];
}

/** Split a `| a | b |` markdown table row into trimmed cell strings. */
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

/** True for a GFM table separator line, e.g. `| --- | :--: |`. */
function isTableSeparator(line: string): boolean {
  const s = line.trim();
  return s.includes('|') && s.includes('-') && /^[|\s:-]+$/.test(s);
}

export function formatMarkdownToReact(content: string): ReactNode {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // GFM table: a header row followed by a `| --- | --- |` separator line.
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = splitTableRow(trimmed);
      i += 2; // consume header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      nodes.push(
        <div key={key++} className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {headers.map((h, j) => (
                  <th
                    key={j}
                    className="border border-border bg-muted px-3 py-1.5 text-left font-semibold"
                  >
                    {parseInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {headers.map((_, c) => (
                    <td key={c} className="border border-border px-3 py-1.5 align-top">
                      {parseInline(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Horizontal rule / divider (`---`, `***`, `___`).
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      nodes.push(<hr key={key++} className="my-4 border-border/60" />);
      i++;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      nodes.push(
        <h4 key={key++} className="mb-2 mt-3 text-sm font-semibold first:mt-0">
          {parseInline(trimmed.replace(/^###\s+/, ''))}
        </h4>,
      );
      i++;
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      nodes.push(
        <h3 key={key++} className="mb-2 mt-3 text-base font-semibold first:mt-0">
          {parseInline(trimmed.replace(/^##\s+/, ''))}
        </h3>,
      );
      i++;
      continue;
    }

    if (/^#\s+/.test(trimmed)) {
      nodes.push(
        <h3 key={key++} className="mb-2 mt-3 text-base font-semibold first:mt-0">
          {parseInline(trimmed.replace(/^#\s+/, ''))}
        </h3>,
      );
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(
          <li key={items.length} className="leading-relaxed">
            {parseInline(lines[i].trim().replace(/^[-*]\s+/, ''))}
          </li>,
        );
        i++;
      }
      nodes.push(
        <ul key={key++} className="mb-2 list-disc space-y-1 pl-5">
          {items}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        // Skip blank lines between numbered items, but only keep the list
        // going if the next non-blank line is itself another numbered item.
        // Otherwise the blank line terminates the list (paragraph follows).
        let next = i;
        while (next < lines.length && !lines[next].trim()) next++;
        if (next >= lines.length || !/^\d+\.\s+/.test(lines[next].trim())) {
          break;
        }
        i = next;

        const itemLines: string[] = [];
        itemLines.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^#{1,3}\s+/.test(lines[i].trim()) &&
          !/^[-*]\s+/.test(lines[i].trim()) &&
          !/^\d+\.\s+/.test(lines[i].trim())
        ) {
          itemLines.push(lines[i].trim());
          i++;
        }
        items.push(
          <li key={items.length} className="space-y-0.5 leading-relaxed">
            {itemLines.map((l, j) => (
              <div key={j}>{parseInline(l)}</div>
            ))}
          </li>,
        );
      }
      nodes.push(
        <ol key={key++} className="mb-2 list-decimal space-y-2 pl-5">
          {items}
        </ol>,
      );
      continue;
    }

    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    nodes.push(
      <p key={key++} className="mb-2 leading-relaxed last:mb-0">
        {paraLines.map((l, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {parseInline(l)}
          </span>
        ))}
      </p>,
    );
  }

  return <>{nodes}</>;
}
