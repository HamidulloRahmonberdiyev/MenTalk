import { apiConfig } from './config';
import { clearToken, getToken, notifyUnauthorized } from './tokenStore';

/** A failed API call. `type` is the problem+json type ('quota', 'turn_in_progress', …). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly type?: string,
    readonly retryAfterSec?: number,
  ) {
    super(type ?? `API request failed (${status})`);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  /** AI calls take several seconds; plain data calls should fail faster. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;
export const AI_TIMEOUT_MS = 45_000;
const MAX_RETRY_WAIT_MS = 6_000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function send(method: string, path: string, { body, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    const token = await getToken();
    return await fetch(`${apiConfig.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

async function problemFrom(response: Response): Promise<ApiError> {
  const problem = (await response.json().catch(() => null)) as { type?: string } | null;
  const retryAfter = Number(response.headers.get('Retry-After'));
  return new ApiError(response.status, problem?.type, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined);
}

/** JSON request that unwraps the `{ data }` envelope. A 503 is retried once after the server's Retry-After. */
export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(method, path, options);

  if (response.status === 503) {
    const error = await problemFrom(response);
    await delay(Math.min((error.retryAfterSec ?? 2) * 1000, MAX_RETRY_WAIT_MS));
    response = await send(method, path, options);
  }

  if (response.status === 401) {
    await clearToken();
    notifyUnauthorized();
  }
  if (!response.ok) throw await problemFrom(response);
  if (response.status === 204) return undefined as T;
  return ((await response.json()) as { data: T }).data;
}
