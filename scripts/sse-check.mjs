// Feeds a recorded turn stream to the SSE parser in every chunk size, the way a mobile network may split it:
//   node --experimental-strip-types scripts/sse-check.mjs
import { SseParser } from '../src/services/api/sse.ts';

const STREAM = [
  'event: transcript\r\ndata: {"text":"Я хочу кофе"}\r\n\r\n',
  ': keep-alive\n\n',
  'event: delta\ndata: {"text":"Отлично! "}\n\n',
  'event: delta\ndata: {"text":"Вам с молоком? ☕"}\n\n',
  'event: reply\ndata: {"id":null,"reply":"Отлично! Вам с молоком? ☕","emotion":"happy"}\n\n',
  'event: audio\ndata: {"url":"https://cdn.example/a.wav","ms":3400}\n\n',
  'event: done\ndata: {"id":4812}',
].join('');

const EXPECTED = ['transcript', 'delta', 'delta', 'reply', 'audio', 'done'];

let failed = 0;
for (const size of [1, 2, 3, 7, 16, 64, STREAM.length]) {
  const parser = new SseParser();
  const events = [];
  for (let i = 0; i < STREAM.length; i += size) events.push(...parser.push(STREAM.slice(i, i + size)));
  events.push(...parser.flush());

  const names = events.map((event) => event.event);
  const reply = JSON.parse(events.find((event) => event.event === 'reply')?.data ?? '{}').reply;
  const ok = JSON.stringify(names) === JSON.stringify(EXPECTED) && reply === 'Отлично! Вам с молоком? ☕';
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} chunks of ${size}: ${names.join(', ')}`);
}

process.exit(failed ? 1 : 0);
