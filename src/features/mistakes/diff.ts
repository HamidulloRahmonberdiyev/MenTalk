/**
 * What a correction changed, worked out on the device from the two sentences alone: no AI, no
 * tokens, for any language that separates words with spaces. Words are compared without case and
 * without the punctuation around them, so "Привет!" and "привет" are the same word.
 */

export interface Segment {
  text: string;
  changed: boolean;
}

/**
 * One edit between what was said and what is right, in the order it appears in the sentence.
 * `from` and `to` are words as written, without the punctuation around them.
 */
export type Change =
  /** The same word in another form: "молоко → молока", "go → goes". */
  | { kind: 'form'; from: string; to: string }
  /** Another word (or words) in its place: "иду → ходил". */
  | { kind: 'replace'; from: string; to: string }
  /** Left out: the right sentence has it, what was said does not. */
  | { kind: 'missing'; to: string }
  /** Said, but not needed. */
  | { kind: 'extra'; from: string }
  /** The right word, in the wrong place. */
  | { kind: 'moved'; word: string }
  /** The same words throughout, only in another order. */
  | { kind: 'order' };

/** More than this and the list stops teaching: the right sentence above already shows the rest. */
const MAX_CHANGES = 4;

/** A sentence with more words out of place than this is better described as "word order". */
const MAX_MOVED = 2;

/** Words as written, punctuation attached. */
export const tokensOf = (text: string): string[] => text.trim().split(/\s+/u).filter(Boolean);

/** A word without the punctuation around it, case kept: how it is shown in a change. */
export const bareToken = (token: string): string => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

/** What two words are compared on: case and punctuation around them do not count. */
export const normalizeToken = (token: string): string => bareToken(token).toLocaleLowerCase();

const comparable = (text: string): string => tokensOf(text).map(normalizeToken).filter(Boolean).join(' ');

export const sameSentence = (a: string, b: string): boolean => comparable(a) === comparable(b);

/** Indexes of the words each side shares with the other, by longest common subsequence. */
function align(x: string[], y: string[]): { a: Set<number>; b: Set<number> } {
  const table = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i -= 1) {
    for (let j = y.length - 1; j >= 0; j -= 1) {
      table[i][j] = x[i] === y[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const keptA = new Set<number>();
  const keptB = new Set<number>();
  for (let i = 0, j = 0; i < x.length && j < y.length; ) {
    if (x[i] === y[j]) {
      keptA.add(i);
      keptB.add(j);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) i += 1;
    else j += 1;
  }
  return { a: keptA, b: keptB };
}

/** Both sentences split into words, each marked if the correction changed it: what to highlight. */
export function diffSegments(said: string, correct: string): { said: Segment[]; correct: Segment[] } {
  const a = tokensOf(said);
  const b = tokensOf(correct);
  const kept = align(a.map(normalizeToken), b.map(normalizeToken));
  return {
    said: a.map((text, index) => ({ text, changed: !kept.a.has(index) })),
    correct: b.map((text, index) => ({ text, changed: !kept.b.has(index) })),
  };
}

/** Positions of the words in what was said that the correction replaced or dropped. */
export function wrongWords(said: string, correct: string): number[] {
  return diffSegments(said, correct).said.flatMap((segment, index) => (segment.changed ? [index] : []));
}

/** How many leading letters two words share, ignoring case. */
export function sharedStart(a: string, b: string): number {
  const x = a.toLocaleLowerCase();
  const y = b.toLocaleLowerCase();
  let n = 0;
  while (n < x.length && n < y.length && x[n] === y[n]) n += 1;
  return n;
}

/**
 * Two words are one word in two forms when they share a real stem: at least two letters and at
 * least half of the shorter one ("иду/идти", "молоко/молока", "go/goes", but not "is/are").
 */
const sameStem = (a: string, b: string): boolean => {
  const shared = sharedStart(a, b);
  return shared >= 2 && shared >= Math.ceil(Math.min(a.length, b.length) / 2);
};

const sameWords = (x: string[], y: string[]): boolean => x.length === y.length && [...x].sort().join(' ') === [...y].sort().join(' ');

interface Gap {
  removed: number[];
  added: number[];
}

/** Every edit that turns what was said into the right sentence, at most `MAX_CHANGES`. */
export function changesOf(said: string, correct: string): Change[] {
  const a = tokensOf(said);
  const b = tokensOf(correct);
  const x = a.map(normalizeToken);
  const y = b.map(normalizeToken);
  const kept = align(x, y);
  // Between two words both sentences keep: what was dropped there, and what was put in.
  const gaps: Gap[] = [];
  for (let i = 0, j = 0; i < a.length || j < b.length; ) {
    const gap: Gap = { removed: [], added: [] };
    for (; i < a.length && !kept.a.has(i); i += 1) if (x[i]) gap.removed.push(i);
    for (; j < b.length && !kept.b.has(j); j += 1) if (y[j]) gap.added.push(j);
    if (gap.removed.length || gap.added.length) gaps.push(gap);
    // Both now stand on the same kept word (or at their ends): step over it together.
    if (i >= a.length || j >= b.length) break;
    i += 1;
    j += 1;
  }

  // A word dropped in one place and put in at another was not wrong, only out of place. Found
  // before anything is listed, so it is never also reported as extra or missing.
  const moved = new Map<Gap, string[]>();
  for (const gap of gaps) {
    for (const added of [...gap.added]) {
      const source = gaps.find((other) => other !== gap && other.removed.some((index) => x[index] === y[added]));
      if (!source) continue;
      source.removed.splice(source.removed.findIndex((index) => x[index] === y[added]), 1);
      gap.added.splice(gap.added.indexOf(added), 1);
      moved.set(gap, [...(moved.get(gap) ?? []), bareToken(b[added])]);
    }
  }

  const changes: Change[] = [];
  for (const gap of gaps) {
    for (const word of moved.get(gap) ?? []) changes.push({ kind: 'moved', word });

    const from = gap.removed.map((index) => bareToken(a[index]));
    const to = gap.added.map((index) => bareToken(b[index]));
    if (from.length && to.length) {
      if (from.length === to.length) {
        from.forEach((word, n) => changes.push({ kind: sameStem(word, to[n]) ? 'form' : 'replace', from: word, to: to[n] }));
      } else {
        changes.push({ kind: 'replace', from: from.join(' '), to: to.join(' ') });
      }
    } else if (from.length) {
      changes.push({ kind: 'extra', from: from.join(' ') });
    } else if (to.length) {
      changes.push({ kind: 'missing', to: to.join(' ') });
    }
  }

  // The same words reordered: one or two that moved are worth naming, a reshuffle is just "order".
  if (sameWords(x.filter(Boolean), y.filter(Boolean)) && changes.length > MAX_MOVED) return [{ kind: 'order' }];

  return changes.slice(0, MAX_CHANGES);
}
