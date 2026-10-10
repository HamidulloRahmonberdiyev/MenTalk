import type { VocabCard, WordSuggestion } from '@/types';

/**
 * Spaced repetition on a seven-step ladder. Each correct answer moves a word one step up and pushes
 * its next review further away, so effort goes to words that are about to be forgotten. A wrong answer
 * drops it two steps and brings it back within minutes.
 *
 * Pure functions only: the store and the UI never compute schedules themselves.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const MAX_STAGE = 6;
/** Wait before the next review once a word has reached each stage. */
const INTERVALS = [0, 8 * HOUR, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY] as const;
const RETRY_AFTER = 10 * MINUTE;

export type Mastery = 'new' | 'learning' | 'known' | 'mastered';

export function masteryOf(stage: number): Mastery {
  if (stage <= 0) return 'new';
  if (stage <= 2) return 'learning';
  if (stage <= 4) return 'known';
  return 'mastered';
}

export const isDue = (card: VocabCard, now: number): boolean => card.due <= now;

export function newCard(suggestion: WordSuggestion, now: number): VocabCard {
  const word = suggestion.word.trim().toLowerCase();
  return { ...suggestion, word, id: word, addedAt: now, stage: 0, due: now, streak: 0, lapses: 0, updatedAt: now };
}

/**
 * Applies one answer. Answering early (the word is not due yet) never inflates the schedule:
 * extra practice is welcome, but only a review that was actually due counts as spaced repetition.
 */
export function review(card: VocabCard, correct: boolean, now: number): VocabCard {
  if (!correct) {
    return { ...card, stage: Math.max(0, card.stage - 2), due: now + RETRY_AFTER, streak: 0, lapses: card.lapses + 1, updatedAt: now };
  }
  if (!isDue(card, now)) return { ...card, streak: card.streak + 1, updatedAt: now };
  const stage = Math.min(MAX_STAGE, card.stage + 1);
  return { ...card, stage, due: now + INTERVALS[stage], streak: card.streak + 1, updatedAt: now };
}
