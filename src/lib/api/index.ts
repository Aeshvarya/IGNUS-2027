/**
 * The backend seam.
 *
 * This repo is frontend-only. Every place the site would talk to a backend (registration,
 * passes, login, live data) goes through this module, so the backend team can map their
 * API here without touching pages or components.
 *
 * Today: everything is static and links out. Set PUBLIC_API_BASE_URL (and the link env vars
 * below) at build time to change targets without code changes.
 */

const env = import.meta.env;

/** Base URL of the future IGNUS backend, e.g. https://api.ignus.example. Empty = no backend. */
export const API_BASE_URL: string = (env.PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
export const hasBackend = API_BASE_URL.length > 0;

/** External links used until (or instead of) backend routes. */
const LINKS = {
  register: env.PUBLIC_REGISTER_URL || '',
  passes: env.PUBLIC_PASSES_URL || '',
};

export type Registrable = { slug?: string; registerUrl?: string | null };

/**
 * Where the "Register" button for an event (or the fest, if no event is given) should go.
 * Priority: event's own link → backend route → global register link → null (button shows "Opening soon").
 */
export function registerHref(event?: Registrable): string | null {
  if (event?.registerUrl) return event.registerUrl;
  if (hasBackend) return event?.slug ? `${API_BASE_URL}/events/${event.slug}/register` : `${API_BASE_URL}/register`;
  return LINKS.register || null;
}

/** Where pass purchases go. Same priority rules as registerHref. */
export function passHref(pass?: { id?: string; url?: string | null }): string | null {
  if (pass?.url) return pass.url;
  if (hasBackend) return pass?.id ? `${API_BASE_URL}/passes/${pass.id}` : `${API_BASE_URL}/passes`;
  return LINKS.passes || null;
}

/**
 * Typed JSON fetch for the backend, for client-side use later (e.g. live seat counts).
 * Not used yet. Kept here so all network calls share one place for base URL, errors and timeouts.
 */
export async function api<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  if (!hasBackend) throw new Error('No backend configured (PUBLIC_API_BASE_URL is empty).');
  const { timeoutMs = 8000, ...rest } = init;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      ...rest,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(rest.headers || {}) },
    });
    if (!res.ok) throw new Error(`API ${res.status} on ${path}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
