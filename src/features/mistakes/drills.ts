import type { ApiNotebookMistake, MistakeExercise } from '@/services/api/endpoints';

/**
 * Drills built on the device from a stored correction: no AI, no tokens, works for any language
 * that separates words with spaces. Three steps from recognising the fix to producing it:
 *
 * - choice: which of the two sentences is right;
 * - spot: tap the word that is wrong in what was said;
 * - build: put the right sentence together from its words, with the wrong ones mixed in.
 */

export type Rng = () => number;

interface DrillBase {
  /** Unique within a round, as the same mistake can come back once more after a miss. */
  id: string;
  mistake: ApiNotebookMistake;
}

export type Drill =
  | (DrillBase & { kind: 'choice'; options: string[] })
  | (DrillBase & { kind: 'spot'; tokens: string[]; wrong: number[] })
  | (DrillBase & { kind: 'build'; bank: string[] });

export interface Segment {
  text: string;
  changed: boolean;
}

/** Words as written, punctuation attached. */
export const tokensOf = (text: string): string[] => text.trim().split(/\s+/u).filter(Boolean);

/** What two words are compared on: case and punctuation around them do not count. */
export const normalizeToken = (token: string): string => token.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

export const sameSentence = (a: string, b: string): boolean => tokensOf(a).map(normalizeToken).filter(Boolean).join(' ') === tokensOf(b).map(normalizeToken).filter(Boolean).join(' ');

/** Indexes of the words each side shares with the other, by longest common subsequence. */
function common(a: string[], b: string[]): { a: Set<number>; b: Set<number> } {
  const x = a.map(normalizeToken);
  const y = b.map(normalizeToken);
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
  const kept = common(a, b);
  return {
    said: a.map((text, index) => ({ text, changed: !kept.a.has(index) })),
    correct: b.map((text, index) => ({ text, changed: !kept.b.has(index) })),
  };
}

/** Positions of the words in what was said that the correction replaced or dropped. */
export function wrongWords(said: string, correct: string): number[] {
  return diffSegments(said, correct).said.flatMap((segment, index) => (segment.changed ? [index] : []));
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MAX_BUILD_WORDS = 10;
const MAX_DISTRACTORS = 3;

/** Spotting needs a wrong word to tap: a correction that only added words has none. */
function canSpot(mistake: ApiNotebookMistake): boolean {
  const tokens = tokensOf(mistake.said);
  const wrong = wrongWords(mistake.said, mistake.correct);
  return tokens.length >= 2 && wrong.length > 0 && wrong.length < tokens.length;
}

function canBuild(mistake: ApiNotebookMistake): boolean {
  const count = tokensOf(mistake.correct).length;
  return count >= 2 && count <= MAX_BUILD_WORDS;
}

/** The harder the step, the better the mistake is known: recognise, then find, then produce. */
export function kindFor(mistake: ApiNotebookMistake): MistakeExercise {
  // A lapse resets `repetitions`, so a forgotten mistake starts again from recognising it.
  if (mistake.repetitions >= 2) return canBuild(mistake) ? 'build' : canSpot(mistake) ? 'spot' : 'choice';
  if (mistake.repetitions === 1) return canSpot(mistake) ? 'spot' : 'choice';
  return 'choice';
}

/** After a miss the mistake comes back once, in another form, so the second try is not a memory of the first. */
export function retryKind(previous: MistakeExercise, mistake: ApiNotebookMistake): MistakeExercise {
  const order: MistakeExercise[] = previous === 'choice' ? ['spot', 'build'] : previous === 'spot' ? ['build', 'choice'] : ['spot', 'choice'];
  return order.find((kind) => (kind === 'spot' ? canSpot(mistake) : kind === 'build' ? canBuild(mistake) : true)) ?? 'choice';
}

export function drillFor(mistake: ApiNotebookMistake, kind: MistakeExercise, rng: Rng, suffix = ''): Drill {
  const id = `${mistake.id}${suffix}`;
  if (kind === 'spot') return { id, mistake, kind, tokens: tokensOf(mistake.said), wrong: wrongWords(mistake.said, mistake.correct) };
  if (kind === 'build') {
    const words = tokensOf(mistake.correct);
    const inAnswer = new Set(words.map(normalizeToken));
    // The learner's own wrong words are the best distractors: they are what they will reach for.
    const distractors = [...new Set(tokensOf(mistake.said).filter((token) => !inAnswer.has(normalizeToken(token))))].slice(0, MAX_DISTRACTORS);
    let bank = shuffle([...words, ...distractors], rng);
    // A bank already in the right order is no exercise.
    if (bank.length > 1 && bank.slice(0, words.length).join(' ') === words.join(' ')) bank = [...bank.slice(1), bank[0]];
    return { id, mistake, kind, bank };
  }
  return { id, mistake, kind: 'choice', options: shuffle([mistake.correct, mistake.said], rng) };
}

export function buildRound(mistakes: ApiNotebookMistake[], rng: Rng = Math.random): Drill[] {
  return mistakes.map((mistake) => drillFor(mistake, kindFor(mistake), rng));
}

/** `given`: the option picked, the index of the word tapped, or the sentence built. */
export function isRight(drill: Drill, given: string): boolean {
  switch (drill.kind) {
    case 'choice':
      return sameSentence(given, drill.mistake.correct);
    case 'spot':
      return drill.wrong.includes(Number(given));
    case 'build':
      return sameSentence(given, drill.mistake.correct);
  }
}
