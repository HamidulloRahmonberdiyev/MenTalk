/**
 * Server-Sent Events framing, as pure logic with no network or React imports, so it can be checked
 * with plain strings. Feed it text in whatever chunks the network delivers; it hands back whole events.
 */

export interface SseEvent {
  /** `message` when the server sent no `event:` line. */
  event: string;
  data: string;
}

export class SseParser {
  private buffer = '';

  /** Adds a chunk and returns every event it completed. A partial event waits for the next chunk. */
  push(chunk: string): SseEvent[] {
    // A trailing '\r' may be the first half of a '\r\n' split across chunks: keep it raw until the next one.
    const raw = this.buffer + chunk;
    const pending = raw.endsWith('\r') ? '\r' : '';
    let text = (pending ? raw.slice(0, -1) : raw).replace(/\r\n?/g, '\n');
    const events: SseEvent[] = [];
    let end = text.indexOf('\n\n');
    while (end !== -1) {
      const event = parseBlock(text.slice(0, end));
      if (event) events.push(event);
      text = text.slice(end + 2);
      end = text.indexOf('\n\n');
    }
    this.buffer = text + pending;
    return events;
  }

  /** The stream closed: whatever is left is the last event, if it has any data. */
  flush(): SseEvent[] {
    const event = parseBlock(this.buffer);
    this.buffer = '';
    return event ? [event] : [];
  }
}

function parseBlock(block: string): SseEvent | null {
  let event = 'message';
  const data: string[] = [];
  for (const line of block.split('\n')) {
    // Lines starting with ':' are comments; servers send them as keep-alive pings.
    if (!line || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return data.length ? { event, data: data.join('\n') } : null;
}
