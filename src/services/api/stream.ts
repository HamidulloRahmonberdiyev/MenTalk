import { fetch as streamingFetch } from 'expo/fetch';

import { apiConfig } from './config';
import { ApiError, NetworkError } from './http';
import { SseParser } from './sse';
import { clearToken, getToken, notifyUnauthorized } from './tokenStore';

/** The server predates this streaming endpoint; the caller should use the classic one instead. */
export class StreamUnsupportedError extends Error {
  constructor(readonly status: number) {
    super(`Streaming endpoint unavailable (${status})`);
    this.name = 'StreamUnsupportedError';
  }
}

interface StreamOptions {
  body: unknown;
  /** Called for every event, in order. Throwing stops the stream and rejects with that error. */
  onEvent: (event: string, data: unknown) => void;
  signal?: AbortSignal;
  /** Longest wait for the next event (the first one included) before the stream counts as stalled. */
  idleTimeoutMs: number;
}

/** Statuses that mean "this route does not exist here", not "this request failed". */
const UNSUPPORTED = new Set([404, 405, 501]);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * POSTs JSON and reads the `text/event-stream` answer as it arrives, so the first words of a reply
 * reach the screen while the server is still producing the rest. Errors follow the same shape as
 * `api()`: `NetworkError` when the server was not heard, `ApiError` when it refused.
 */
export async function streamEvents(path: string, { body, onEvent, signal, idleTimeoutMs }: StreamOptions): Promise<void> {
  const controller = new AbortController();
  let timedOut = false;
  let idle: ReturnType<typeof setTimeout> | null = null;
  const touch = () => {
    if (idle) clearTimeout(idle);
    idle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, idleTimeoutMs);
  };
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  touch();

  try {
    const token = await getToken();
    let response;
    try {
      response = await streamingFetch(`${apiConfig.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new NetworkError(timedOut, error);
    }

    if (response.status === 401) {
      await clearToken();
      notifyUnauthorized();
    }
    if (UNSUPPORTED.has(response.status)) throw new StreamUnsupportedError(response.status);
    if (!response.ok) {
      const problem = (await response.json().catch(() => null)) as { type?: string } | null;
      throw new ApiError(response.status, problem?.type);
    }
    // A proxy that answers with plain JSON (an older server behind a catch-all route) cannot stream.
    if (!response.headers.get('Content-Type')?.includes('text/event-stream') || !response.body) {
      throw new StreamUnsupportedError(response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    const deliver = (events: ReturnType<SseParser['push']>) => events.forEach(({ event, data }) => onEvent(event, parseJson(data)));

    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new NetworkError(timedOut, error);
      }
      if (chunk.done) break;
      touch();
      deliver(parser.push(decoder.decode(chunk.value, { stream: true })));
    }
    deliver(parser.push(decoder.decode()));
    deliver(parser.flush());
  } finally {
    if (idle) clearTimeout(idle);
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}
