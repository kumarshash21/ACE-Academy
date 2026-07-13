/**
 * Server-side-only client for the ACE-Academy-backend (Express + Postgres)
 * API. Only ever call this from route handlers (app/api/**\/route.ts) —
 * never from client components — so BACKEND_API_URL and the internal key
 * never reach the browser.
 *
 * Every call site is expected to follow the backend-primary/Firebase-fallback
 * pattern: try this, and on a thrown error or non-2xx response, fall through
 * to the existing Firestore logic already in that route.
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL;
const BACKEND_INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY;

/** Thrown when the backend responds, but not with a 2xx status. */
export class BackendApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    super(`Backend API responded ${status}`);
    this.name = "BackendApiError";
  }
}

/**
 * Calls the backend API and returns the parsed JSON body.
 * Throws (network error, missing config, or non-2xx) on any failure —
 * callers should catch and fall back to Firestore.
 */
export async function fetchBackendJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BACKEND_API_URL || !BACKEND_INTERNAL_API_KEY) {
    throw new Error("BACKEND_API_URL/BACKEND_INTERNAL_API_KEY not configured.");
  }

  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": BACKEND_INTERNAL_API_KEY,
      ...init.headers,
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new BackendApiError(response.status, body);
  }

  return (await response.json()) as T;
}
