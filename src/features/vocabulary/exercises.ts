import type { VocabCard } from '@/types';

import { maskWord, normalizeWord } from './words';

/**
 * Builds a practice round. The exercise type follows how well the word is known: recognising a
 * meaning comes first, then hearing it, then producing it from a clue, then spelling it. Types are
 * interleaved so no two in a row are alike. Pure functions; randomness is injected for testing.
 */

export type ExerciseKind = 'choice' | 'reverse' | 'listen' | 'cloze' | 'spell';
export type Random = () => number;

export interface Exercise {
  id: string;
  kind: ExerciseKind;
  card: VocabCard;
  /** The correct response: a translation, a Russian word, or the spelled word. */
  answer: string;
  /** Multiple-choice options (empty for spelling). */
  options: string[];
  /** Shuffled letters for spelling (empty otherwise). */
  tiles: string[];
  /** The example sentence with the word blanked out (cloze only). */
  sentence?: string;
}

export const DEFAULT_ROUND_SIZE = 10;
const OPTION_COUNT = 4;

/** What the word is called when it has to be written or recognised: the form seen in the sentence. */
export const surfaceOf = (card: VocabCard): string => card.form ?? card.word;

const KINDS_BY_STAGE: readonly (readonly ExerciseKind[])[] = [
  ['choice'],
  ['choice', 'listen'],
  ['reverse', 'listen', 'cloze'],
  ['reverse', 'cloze', 'spell'],
  ['spell', 'cloze', 'reverse'],
  ['spell', 'cloze', 'reverse'],
  ['spell', 'cloze', 'reverse'],
];

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function distractors(answer: string, pool: string[], random: Random): string[] {
  const taken = new Set([normalizeWord(answer)]);
  const unique = pool.filter((value) => {
    const key = normalizeWord(value);
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });
  return shuffle(unique, random).slice(0, OPTION_COUNT - 1);
}

function choicesFor(answer: string, pool: string[], random: Random): string[] | null {
  const wrong = distractors(answer, pool, random);
  return wrong.length >= 2 ? shuffle([answer, ...wrong], random) : null;
}

function spellable(word: string): boolean {
  return !/\s/.test(word) && word.length >= 2 && word.length <= 14;
}

function make(kind: ExerciseKind, card: VocabCard, others: VocabCard[], random: Random): Exercise | null {
  const base = { id: `${card.id}:${kind}`, kind, card, tiles: [] as string[] };
  switch (kind) {
    case 'choice':
    case 'listen': {
      const options = choicesFor(card.translation, others.map((item) => item.translation), random);
      return options ? { ...base, answer: card.translation, options } : null;
    }
    case 'reverse': {
      const options = choicesFor(surfaceOf(card), others.map(surfaceOf), random);
      return options ? { ...base, answer: surfaceOf(card), options } : null;
    }
    case 'cloze': {
      const sentence = card.example ? maskWord(card.example, surfaceOf(card)) : null;
      const options = sentence ? choicesFor(surfaceOf(card), others.map(surfaceOf), random) : null;
      return sentence && options ? { ...base, answer: surfaceOf(card), options, sentence } : null;
    }
    case 'spell': {
      const word = surfaceOf(card);
      return spellable(word) ? { ...base, answer: word, options: [], tiles: shuffle([...word.toLowerCase()], random) } : null;
    }
  }
}

/** The exercise for one card: the preferred type for its stage that the word list can support. */
export function exerciseFor(card: VocabCard, all: VocabCard[], previous: ExerciseKind | null, random: Random): Exercise {
  const others = all.filter((item) => item.id !== card.id);
  const preferred = shuffle(KINDS_BY_STAGE[Math.min(card.stage, KINDS_BY_STAGE.length - 1)], random);
  const ordered = [...preferred.filter((kind) => kind !== previous), ...preferred.filter((kind) => kind === previous)];
  for (const kind of [...ordered, 'choice', 'spell'] as ExerciseKind[]) {
    const exercise = make(kind, card, others, random);
    if (exercise) return exercise;
  }
  // A lone word that cannot be spelled either (e.g. one letter): a single-option "choice" still works.
  return { id: `${card.id}:choice`, kind: 'choice', card, answer: card.translation, options: [card.translation], tiles: [] };
}

/** Due words first (most overdue first), topped up with the least-known words, then mixed. */
export function pickCards(cards: VocabCard[], now: number, size: number, random: Random): VocabCard[] {
  const due = cards.filter((card) => card.due <= now).sort((a, b) => a.due - b.due);
  const rest = cards.filter((card) => card.due > now).sort((a, b) => a.stage - b.stage || a.due - b.due);
  return shuffle([...due, ...rest].slice(0, size), random);
}

export function buildRound(cards: VocabCard[], now: number, random: Random = Math.random, size = DEFAULT_ROUND_SIZE): Exercise[] {
  const exercises: Exercise[] = [];
  let previous: ExerciseKind | null = null;
  for (const card of pickCards(cards, now, size, random)) {
    const exercise = exerciseFor(card, cards, previous, random);
    exercises.push(exercise);
    previous = exercise.kind;
  }
  return exercises;
}

export const isCorrect = (exercise: Exercise, given: string): boolean => normalizeWord(given) === normalizeWord(exercise.answer);
