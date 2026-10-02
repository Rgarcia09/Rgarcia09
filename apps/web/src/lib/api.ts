// Same-origin API client. Sends the CSRF token on every state-changing request and turns
// API errors into readable messages.

const CSRF_COOKIE = "ava_csrf";
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: { field: string; message: string }[] = [],
  ) {
    super(message);
  }
}

export function readCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const err = body?.error;
    if (err?.message) return new ApiError(res.status, err.code ?? "error", err.message, err.fields ?? []);
  } catch {
    /* fall through */
  }
  if (res.status >= 500) {
    return new ApiError(res.status, "unavailable", "The AVA server could not be reached. Try again shortly.");
  }
  return new ApiError(res.status, "error", "The request could not be completed.");
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const method = (init.method ?? (init.json !== undefined ? "POST" : "GET")).toUpperCase();
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  if (!SAFE.has(method) && typeof document !== "undefined") {
    const csrf = readCookie(document.cookie, CSRF_COOKIE);
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  let res: Response;
  try {
    res = await fetch(path, { ...init, method, headers, body, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "network", "The AVA server could not be reached. Check the office network connection.");
  }
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/login")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${next}`;
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
