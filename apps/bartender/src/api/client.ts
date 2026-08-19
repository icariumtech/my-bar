// Small typed fetch wrapper — throws on any non-2xx response so callers
// (TanStack Query hooks) get a rejected promise they can surface as an
// error state, rather than silently returning an error-shaped JSON body.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? `Request to ${path} failed: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
