/**
 * Turns a line of text into a mouth-shape timeline ("visemes") plus expression cues, so the tutor's face
 * moves with what it actually says: lips close on м/б/п, round on о/у, spread on и/е, the jaw drops on а,
 * brows flick on stressed words, rise through a question, and the head settles with a blink at each pause.
 *
 * Timing is estimated from the text at the speech rate; the player then keeps it in sync with the real
 * voice (word boundaries from the device TTS, or the playback position of a synthesized file).
 * Everything here is plain arrays so the UI thread can read the track without touching React.
 */

/** Mouth pose: jaw opening, lip spread (+) / pucker (-), rounding, upper-teeth and tongue visibility. */
export interface Shape {
  jaw: number;
  spread: number;
  round: number;
  teeth: number;
  tongue: number;
}

type Viseme = 'A' | 'O' | 'U' | 'E' | 'I' | 'Y' | 'M' | 'F' | 'T' | 'L' | 'S' | 'SH' | 'K' | 'R' | 'J';

const SHAPES: Record<Viseme, Shape> = {
  A: { jaw: 0.86, spread: 0.15, round: 0, teeth: 0.35, tongue: 0.45 },
  O: { jaw: 0.62, spread: -0.25, round: 0.78, teeth: 0.1, tongue: 0.2 },
  U: { jaw: 0.3, spread: -0.45, round: 1, teeth: 0, tongue: 0 },
  E: { jaw: 0.56, spread: 0.45, round: 0, teeth: 0.55, tongue: 0.3 },
  I: { jaw: 0.32, spread: 0.72, round: 0, teeth: 0.75, tongue: 0.1 },
  Y: { jaw: 0.4, spread: 0.4, round: 0, teeth: 0.5, tongue: 0.15 },
  M: { jaw: 0, spread: 0.05, round: 0.05, teeth: 0, tongue: 0 },
  F: { jaw: 0.12, spread: 0.25, round: 0, teeth: 1, tongue: 0 },
  T: { jaw: 0.26, spread: 0.25, round: 0, teeth: 0.6, tongue: 0.9 },
  L: { jaw: 0.3, spread: 0.2, round: 0, teeth: 0.4, tongue: 1 },
  S: { jaw: 0.14, spread: 0.5, round: 0.1, teeth: 1, tongue: 0 },
  SH: { jaw: 0.18, spread: -0.1, round: 0.45, teeth: 0.9, tongue: 0 },
  K: { jaw: 0.36, spread: 0.15, round: 0, teeth: 0.3, tongue: 0.3 },
  R: { jaw: 0.3, spread: 0.2, round: 0, teeth: 0.45, tongue: 0.8 },
  J: { jaw: 0.24, spread: 0.6, round: 0, teeth: 0.6, tongue: 0.2 },
};

const VOWELS = new Set<Viseme>(['A', 'O', 'U', 'E', 'I', 'Y']);

/** Seconds per sound at rate 1. Vowels carry the rhythm; stops are short. */
const DURATION: Record<Viseme, number> = {
  A: 0.1, O: 0.1, U: 0.095, E: 0.09, I: 0.085, Y: 0.09,
  M: 0.075, F: 0.075, T: 0.055, L: 0.06, S: 0.085, SH: 0.09, K: 0.065, R: 0.06, J: 0.045,
};

const LETTERS: Record<string, Viseme> = {
  а: 'A', я: 'A', о: 'O', ё: 'O', у: 'U', ю: 'U', э: 'E', е: 'E', и: 'I', ы: 'Y',
  м: 'M', б: 'M', п: 'M', ф: 'F', в: 'F', л: 'L', т: 'T', д: 'T', н: 'T',
  с: 'S', з: 'S', ц: 'S', ш: 'SH', щ: 'SH', ж: 'SH', ч: 'SH', к: 'K', г: 'K', х: 'K', р: 'R', й: 'J',
  a: 'A', o: 'O', u: 'U', e: 'E', i: 'I', y: 'I',
  m: 'M', b: 'M', p: 'M', f: 'F', v: 'F', w: 'U', l: 'L', t: 'T', d: 'T', n: 'T',
  s: 'S', z: 'S', c: 'S', j: 'SH', k: 'K', g: 'K', q: 'K', x: 'K', h: 'K', r: 'R',
};

/** A digit is read as a whole word; approximate it with two syllables. */
const DIGIT_SOUNDS: readonly Viseme[] = ['T', 'E', 'K', 'A'];

const PAUSES: Record<string, number> = {
  ',': 0.2, ';': 0.26, ':': 0.24, '—': 0.22, '–': 0.2, '-': 0.04,
  '.': 0.42, '!': 0.42, '?': 0.42, '…': 0.55, '\n': 0.3,
};

/** The face leads the sound slightly; lips that move late look dubbed. */
const LEAD = 0.035;

export const CueKind = {
  /** A stressed / important word: brow flick and a small nod. */
  Emphasis: 0,
  /** A pause: the head settles and the eyes blink. */
  PhraseEnd: 1,
  /** A new phrase begins: the head shifts to a new angle. */
  PhraseStart: 2,
} as const;

export const SentenceKind = {
  Statement: 0,
  Question: 1,
  Exclamation: 2,
  Trailing: 3,
} as const;

export interface SpeechTrack {
  /** Seconds, at rate 1. */
  duration: number;
  /** Mouth keyframes. */
  t: number[];
  jaw: number[];
  spread: number[];
  round: number[];
  teeth: number[];
  tongue: number[];
  /** Start time of every character of the text (length = text.length + 1). */
  charTime: number[];
  /** Expression cues, sorted by time. */
  cueT: number[];
  cueKind: number[];
  cueStrength: number[];
  /** Sentences with their intonation and mood. */
  sentT0: number[];
  sentT1: number[];
  sentKind: number[];
  /** -1..1 how warm / smiley the sentence is. */
  sentSmile: number[];
  /** 0..1 how apologetic / sympathetic (inner brows up). */
  sentCare: number[];
}

const WARM = /спасибо|отлично|молодец|прекрасно|супер|здорово|рад|класс|хорош|ура|приятно|great|good|nice|thanks|excellent|😊|😀|😄|🙂|🎉|👍/i;
const CARE = /извин|простите|жаль|сожале|не страшно|ничего страшного|бывает|sorry/i;

function sentenceMood(text: string): { smile: number; care: number } {
  return { smile: WARM.test(text) ? 0.45 : 0, care: CARE.test(text) ? 0.8 : 0 };
}

/** Cheap deterministic variation so repeated vowels don't open identically. */
function jitter(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const isLetter = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

export function buildSpeechTrack(text: string): SpeechTrack {
  const track: SpeechTrack = {
    duration: 0, t: [], jaw: [], spread: [], round: [], teeth: [], tongue: [], charTime: [],
    cueT: [], cueKind: [], cueStrength: [], sentT0: [], sentT1: [], sentKind: [], sentSmile: [], sentCare: [],
  };
  let time = 0.06;
  let vowelCount = 0;

  const key = (at: number, shape: Shape, scale = 1) => {
    // Keyframes must stay sorted; a lead can't move a frame before the previous one.
    const t = Math.max(at - LEAD, track.t.length ? track.t[track.t.length - 1] + 0.005 : 0);
    track.t.push(t);
    track.jaw.push(shape.jaw * scale);
    track.spread.push(shape.spread);
    track.round.push(shape.round);
    track.teeth.push(shape.teeth);
    track.tongue.push(shape.tongue);
  };
  const REST: Shape = { jaw: 0, spread: 0, round: 0, teeth: 0, tongue: 0 };
  const cue = (at: number, kind: number, strength: number) => {
    track.cueT.push(at);
    track.cueKind.push(kind);
    track.cueStrength.push(strength);
  };

  const sound = (viseme: Viseme, stretch = 1) => {
    const shape = SHAPES[viseme];
    const d = DURATION[viseme] * stretch;
    if (viseme === 'M') {
      // Lips must visibly meet for м/б/п, so hold the closure for most of the sound.
      key(time + d * 0.2, shape);
      key(time + d * 0.8, shape);
    } else if (VOWELS.has(viseme)) {
      vowelCount += 1;
      key(time + d * 0.5, shape, 0.82 + jitter(vowelCount) * 0.26);
    } else {
      key(time + d * 0.5, shape);
    }
    time += d;
  };

  const pause = (length: number) => {
    key(time + Math.min(0.06, length * 0.4), REST);
    if (length > 0.15) key(time + length - 0.05, REST);
    time += length;
  };

  // Words: [start, end) character ranges, used for emphasis.
  const chars = Array.from(text);
  let offset = 0; // index into the UTF-16 string, which is what TTS boundary events report
  let wordStart = -1;
  let wordLetters = 0;
  let wordFirstVowelT = -1;
  let sentenceStart = time;
  let sentenceTextStart = 0;
  let phraseOpen = false;
  let lastEmphasis = -1;

  const closeWord = (endIndex: number) => {
    if (wordStart < 0) return;
    const word = text.slice(wordStart, endIndex);
    const shout = word.length > 1 && word === word.toUpperCase() && /\p{Lu}/u.test(word);
    let strength = Math.min(1, Math.max(0, (wordLetters - 4) / 6)) + (shout ? 0.6 : 0);
    const next = text.slice(endIndex).trimStart()[0];
    if (next === '!') strength += 0.5;
    if (strength > 0.3 && wordFirstVowelT >= 0 && wordFirstVowelT - lastEmphasis > 0.55) {
      cue(wordFirstVowelT, CueKind.Emphasis, Math.min(1, strength));
      lastEmphasis = wordFirstVowelT;
    }
    wordStart = -1;
    wordLetters = 0;
    wordFirstVowelT = -1;
  };

  const closeSentence = (endIndex: number, mark: string) => {
    const sentence = text.slice(sentenceTextStart, endIndex);
    if (sentence.trim()) {
      const mood = sentenceMood(sentence);
      track.sentT0.push(sentenceStart);
      track.sentT1.push(time);
      track.sentKind.push(
        mark === '?' ? SentenceKind.Question : mark === '!' ? SentenceKind.Exclamation : mark === '…' ? SentenceKind.Trailing : SentenceKind.Statement,
      );
      track.sentSmile.push(mood.smile + (mark === '!' ? 0.25 : 0));
      track.sentCare.push(mood.care);
    }
    sentenceTextStart = endIndex;
  };

  key(0, REST);
  for (const ch of chars) {
    const lower = ch.toLowerCase();
    for (let k = 0; k < ch.length; k += 1) track.charTime[offset + k] = time;

    if (isLetter(ch)) {
      if (!phraseOpen) {
        cue(time, CueKind.PhraseStart, 1);
        phraseOpen = true;
      }
      if (wordStart < 0) wordStart = offset;
      wordLetters += 1;
      const viseme = LETTERS[lower];
      if (viseme) {
        if (VOWELS.has(viseme) && wordFirstVowelT < 0) wordFirstVowelT = time;
        // Soft vowels start with a short "й".
        if ((lower === 'я' || lower === 'ю' || lower === 'ё') && wordLetters === 1) sound('J', 0.7);
        sound(viseme);
      } else if (/\p{N}/u.test(ch)) {
        for (const part of DIGIT_SOUNDS) sound(part);
      }
      // ь / ъ and unknown letters take no time of their own.
    } else {
      closeWord(offset);
      const gap = PAUSES[ch];
      if (gap !== undefined) {
        if (gap >= 0.15) {
          if (phraseOpen) cue(time, CueKind.PhraseEnd, gap >= 0.4 ? 1 : 0.5);
          phraseOpen = false;
        }
        pause(gap);
        if (ch === '.' || ch === '!' || ch === '?' || ch === '…' || ch === '\n') {
          closeSentence(offset + ch.length, ch);
          sentenceStart = time;
        }
      } else if (/\s/.test(ch)) {
        time += 0.025;
      }
    }
    offset += ch.length;
  }
  closeWord(offset);
  if (phraseOpen) cue(time, CueKind.PhraseEnd, 1);
  closeSentence(offset, '.');
  track.charTime[offset] = time;
  key(time + 0.08, REST);
  track.duration = time + 0.1;
  return track;
}

/** Mouth pose at `time` with eased blending between keyframes (coarticulation). Runs on the UI thread. */
export function sampleTrack(track: SpeechTrack, time: number, out: Shape): void {
  'worklet';
  const ts = track.t;
  const n = ts.length;
  if (n === 0 || time <= ts[0] || time >= ts[n - 1]) {
    out.jaw = 0;
    out.spread = 0;
    out.round = 0;
    out.teeth = 0;
    out.tongue = 0;
    return;
  }
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= time) lo = mid;
    else hi = mid;
  }
  const span = ts[hi] - ts[lo];
  const x = span > 0 ? (time - ts[lo]) / span : 0;
  const k = x * x * (3 - 2 * x);
  out.jaw = track.jaw[lo] + (track.jaw[hi] - track.jaw[lo]) * k;
  out.spread = track.spread[lo] + (track.spread[hi] - track.spread[lo]) * k;
  out.round = track.round[lo] + (track.round[hi] - track.round[lo]) * k;
  out.teeth = track.teeth[lo] + (track.teeth[hi] - track.teeth[lo]) * k;
  out.tongue = track.tongue[lo] + (track.tongue[hi] - track.tongue[lo]) * k;
}

/** Index of the sentence playing at `time`, or -1. */
export function sentenceAt(track: SpeechTrack, time: number): number {
  'worklet';
  // The latest sentence that has started; its intonation lingers briefly into the following pause.
  for (let i = track.sentT0.length - 1; i >= 0; i -= 1) {
    if (time >= track.sentT0[i]) return time < track.sentT1[i] + 0.25 ? i : -1;
  }
  return -1;
}
