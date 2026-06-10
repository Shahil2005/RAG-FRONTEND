function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? '';
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { orgId?: string },
): Promise<T> {
  const base = getApiBase();
  const url = base ? `${base}/api/v1${path}` : `/api/v1${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.orgId ? { 'x-organization-id': options.orgId } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

/** Export generated document content to a .pdf / .docx file and trigger a download. */
export async function downloadDocument(
  content: string,
  format: 'pdf' | 'docx',
  filename: string,
): Promise<void> {
  const base = getApiBase();
  const url = base ? `${base}/api/v1/documents/export` : `/api/v1/documents/export`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, format, filename }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${filename}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Multipart upload without forcing JSON Content-Type. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const base = getApiBase();
  const url = base ? `${base}/api/v1${path}` : `/api/v1${path}`;

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}
