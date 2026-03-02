const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

/**
 * Minimal fetch wrapper with automatic Bearer token injection and
 * one-shot 401 → refresh → retry flow.
 *
 * @param path    Endpoint path (e.g. '/users/me')
 * @param options Standard RequestInit options
 * @param getToken  Returns the current in-memory access token (or null)
 * @param onRefresh Attempts a token refresh; returns the new access token or null
 * @param onUnauthorized Called when refresh also fails (redirect to /login)
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit,
  getToken: () => string | null,
  onRefresh: () => Promise<string | null>,
  onUnauthorized: () => void,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    const newToken = await onRefresh();
    if (!newToken) {
      onUnauthorized();
      throw new Error('Unauthorized');
    }
    headers.set('Authorization', `Bearer ${newToken}`);
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string })?.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Raw fetch to the API without auth (login, register, refresh). */
export async function publicFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string })?.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
