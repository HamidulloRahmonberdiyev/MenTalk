import type { ApiNotebookMistake, MistakeExercise } from '@/services/api/endpoints';

import { normalizeToken, sameSentence, tokensOf, wrongWords } from './diff';

/**
 * A practice round built on the device from stored corrections: no AI, no tokens, works for any
 * language that separates words with spaces. A mistake not learned yet is first explained, then
 * tested; the tests go from recognising the fix to producing it:
 *
 * - lesson: what was said, what is right, what changed and why; nothing to answer;
 * - choice: which of the two sentences is right;
 * - spot: tap the word that is wrong in what was said;
 * - build: put the right sentence together from its words, with the wrong ones mixed in.
 */

export type Rng = () => number;

interface StepBase {
  /** Unique within a round, as the same mistake can come back once more after a miss. */
  id: string;
  mistake: ApiNotebookMistake;
}

export type Drill =
  | (StepBase & { kind: 'choice'; options: string[] })
  | (StepBase & { kind: 'spot'; tokens: string[]; wrong: number[] })
  | (StepBase & { kind: 'build'; bank: string[] });

export type Lesson = StepBase & { kind: 'lesson' };

export type Step = Lesson | Drill;

export const isDrill = (step: Step): step is Drill => step.kind !== 'lesson';

/**
 * How many other steps come between a lesson and its test: answering straight after reading is
 * copying, a step in between makes it recall.
 */
const LESSON_GAP = 1;

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

/**
 * A mistake never answered right (new, or forgotten: a lapse resets `repetitions`) is explained
 * before it is tested. Testing first would only show the learner options they cannot yet tell apart.
 */
export const needsLesson = (mistake: ApiNotebookMistake): boolean => mistake.repetitions === 0;

/**
 * The first test after a lesson: the lesson already put both sentences side by side, so telling
 * them apart again teaches little; finding the wrong word in their own sentence does.
 */
const kindAfterLesson = (mistake: ApiNotebookMistake): MistakeExercise => (canSpot(mistake) ? 'spot' : 'choice');

/**
 * The round in the order given (due first), each lesson's test held back until `LESSON_GAP` other
 * steps have passed: lesson A, review B, test A, … Tests still held when the round runs out come last.
 */
export function buildRound(mistakes: ApiNotebookMistake[], rng: Rng = Math.random): Step[] {
  const steps: Step[] = [];
  const held: { drill: Drill; after: number }[] = [];

  for (const mistake of mistakes) {
    if (needsLesson(mistake)) {
      steps.push({ id: `${mistake.id}:lesson`, mistake, kind: 'lesson' });
      held.push({ drill: drillFor(mistake, kindAfterLesson(mistake), rng), after: steps.length });
    } else {
      steps.push(drillFor(mistake, kindFor(mistake), rng));
    }
    while (held.length > 0 && steps.length - held[0].after >= LESSON_GAP) steps.push(held.shift()!.drill);
  }

  return [...steps, ...held.map(({ drill }) => drill)];
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
