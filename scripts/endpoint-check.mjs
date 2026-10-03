// Simulates microphone loudness streams to check the end-of-speech detector:
//   node --experimental-strip-types scripts/endpoint-check.mjs
import { SpeechEndpointDetector } from '../src/features/conversation/speechEndpoint.ts';

const TICK = 50;
const rnd = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Builds a dB stream from segments: [ms, level, wobble]. */
function stream(segments, seed = 7) {
  const random = rnd(seed);
  return segments.flatMap(([ms, level, wobble = 3]) =>
    Array.from({ length: Math.round(ms / TICK) }, () => level + (random() - 0.5) * 2 * wobble),
  );
}

function run(name, readings, expect) {
  const detector = new SpeechEndpointDetector();
  let now = 0;
  let result = 'continue';
  for (const db of readings) {
    result = detector.push(db, now);
    now += TICK;
    if (result !== 'continue') break;
  }
  const ok = result === expect.result && (expect.maxMs === undefined || now <= expect.maxMs) && (expect.minMs === undefined || now >= expect.minMs);
  console.log(`${ok ? '✓' : '✗'} ${name}: ${result} after ${now} ms`);
  if (!ok) process.exitCode = 1;
}

run('normal sentence then pause, quiet room', stream([[600, -58], [2500, -22, 8], [1500, -58]]), { result: 'end', maxMs: 3100 + 1000 });
run('quiet speaker', stream([[600, -60], [2200, -36, 5], [1500, -60]]), { result: 'end', maxMs: 2800 + 1000 });
run('loud speaker with soft tail', stream([[500, -55], [2500, -12, 6], [1200, -34, 2], [1500, -55]]), { result: 'end', maxMs: 3000 + 2300 });
run('noisy street (steady -40 dB)', stream([[600, -40, 2], [2500, -18, 8], [1500, -40, 2]]), { result: 'end', maxMs: 3100 + 1100 });
run('short word', stream([[400, -58], [500, -24, 6], [1500, -58]]), { result: 'end', maxMs: 900 + 1100 });
run('pause mid-sentence of 500 ms does not end the turn', stream([[400, -58], [1500, -22, 8], [500, -56], [1200, -22, 8], [1500, -58]]), { result: 'end', minMs: 400 + 1500 + 500 + 1200 + 600 });
run('long sentence ends faster after the pause', stream([[400, -58], [6000, -22, 8], [1200, -58]]), { result: 'end', maxMs: 6400 + 800 });
run('cough does not count as speech', stream([[500, -58], [150, -15], [7600, -58]]), { result: 'noSpeech' });
run('silence only', stream([[8000, -58]]), { result: 'noSpeech', maxMs: 7100 });
run('no metering available', Array.from({ length: 60 }, () => undefined), { result: 'unsupported' });
