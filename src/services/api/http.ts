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

/** The server was never heard from: no connection, a dropped connection, or no answer in time. */
export class NetworkError extends Error {
  constructor(readonly timedOut: boolean) {
    super(timedOut ? 'API request timed out' : 'Network request failed');
    this.name = 'NetworkError';
  }
}

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  /** AI calls take several seconds; plain data calls should fail faster. */
  timeoutMs?: number;
  /**
   * Safe to send twice (reads, cached lookups, `finish`): any network failure is retried.
   * Otherwise only a dropped connection is retried once, never a timeout, since the server may still
   * be working on the first copy. Defaults to true for everything but POST.
   */
  idempotent?: boolean;
}

const DEFAULT_TIMEOUT_MS = 20_000;
export const AI_TIMEOUT_MS = 45_000;
const MAX_RETRY_WAIT_MS = 6_000;
/** Waits before each network retry; mobile links usually come back within a couple of seconds. */
const NETWORK_BACKOFF_MS = [800, 2_000];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const newIdempotencyKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

interface Sent {
  response: Response;
  /** Read inside the timeout, so a response that stalls halfway still fails instead of hanging. */
  payload: unknown;
}

async function send(method: string, path: string, idempotencyKey: string | null, { body, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions): Promise<Sent> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    const token = await getToken();
    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    return { response, payload };
  } catch (error) {
    // The caller cancelled: let its AbortError through untouched.
    if (signal?.aborted) throw error;
    throw new NetworkError(timedOut);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

function problemFrom({ response, payload }: Sent): ApiError {
  const problem = payload as { type?: string } | null;
  const retryAfter = Number(response.headers.get('Retry-After'));
  return new ApiError(response.status, problem?.type, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined);
}

/** Sends the request, retrying network failures as far as `idempotent` allows. */
async function sendWithRetry(method: string, path: string, options: RequestOptions): Promise<Sent> {
  const idempotent = options.idempotent ?? method !== 'POST';
  // One key for every copy of this call, so a server that honours it can drop the duplicates.
  const key = method === 'POST' ? newIdempotencyKey() : null;
  const maxRetries = idempotent ? NETWORK_BACKOFF_MS.length : 1;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await send(method, path, key, options);
    } catch (error) {
      const retryable = error instanceof NetworkError && (idempotent || !error.timedOut);
      if (!retryable || attempt >= maxRetries || options.signal?.aborted) throw error;
      await delay(NETWORK_BACKOFF_MS[attempt]);
    }
  }
}

/**
 * JSON request that unwraps the `{ data }` envelope. Dropped connections are retried (see
 * `idempotent`), and a 503 once more after the server's Retry-After.
 */
export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, options: RequestOptions = {}): Promise<T> {
  let sent = await sendWithRetry(method, path, options);

  if (sent.response.status === 503) {
    const error = problemFrom(sent);
    await delay(Math.min((error.retryAfterSec ?? 2) * 1000, MAX_RETRY_WAIT_MS));
    sent = await sendWithRetry(method, path, options);
  }

  if (sent.response.status === 401) {
    await clearToken();
    notifyUnauthorized();
  }
  if (!sent.response.ok) throw problemFrom(sent);
  if (sent.response.status === 204) return undefined as T;
  if (!sent.payload) throw new ApiError(sent.response.status, 'malformed_response');
  return (sent.payload as { data: T }).data;
}
