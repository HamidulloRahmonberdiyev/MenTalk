import type { ReviewRating, VocabCard, WordSuggestion } from '@/types';

/**
 * SM-2 spaced repetition, the same rules the server runs (`App\Support\Srs`): change both together.
 * Each review that was due grows the interval by the word's ease; a miss starts it over within
 * minutes and makes it harder. The server recomputes every round, so the two never drift for long.
 *
 * Pure functions only: the store and the UI never compute schedules themselves.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const START_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_INTERVAL_DAYS = 365;
/** From this interval on a word counts as known (server: `WordStatus::Known`). */
const KNOWN_AFTER_DAYS = 21;
/** Known words this far apart count as mastered: a display step only, the server does not have it. */
const MASTERED_AFTER_DAYS = 60;
const RETRY_AFTER = 10 * MINUTE;

/** Interval (days) that starts each level of the seven-step progress shown in the app. */
const LEVEL_DAYS = [1, 3, 7, 16, 35] as const;
export const MAX_LEVEL = LEVEL_DAYS.length + 1;

export const Rating = { again: 1, hard: 2, good: 3, easy: 4 } as const satisfies Record<string, ReviewRating>;

/** Games only know right or wrong. */
export const ratingOf = (correct: boolean): ReviewRating => (correct ? Rating.good : Rating.again);

export type Mastery = 'new' | 'learning' | 'known' | 'mastered';

export function masteryOf(card: VocabCard): Mastery {
  if (card.status === 'known') return card.intervalDays >= MASTERED_AFTER_DAYS ? 'mastered' : 'known';
  return card.status;
}

/** 0 (never reviewed) to `MAX_LEVEL`: how far along the word is, for dots, bars and exercise choice. */
export function levelOf(card: VocabCard): number {
  if (card.status === 'new') return 0;
  return 1 + LEVEL_DAYS.filter((days) => card.intervalDays >= days).length;
}

export const isDue = (card: VocabCard, now: number): boolean => card.due <= now;

/** A word nobody has practised yet; unsaving it loses no progress. */
export const isUntouched = (card: VocabCard): boolean => card.status === 'new' && card.lapses === 0;

export function newCard(suggestion: WordSuggestion, now: number): VocabCard {
  const word = suggestion.word.trim().toLowerCase();
  return { ...suggestion, word, id: word, addedAt: now, status: 'new', ease: START_EASE, intervalDays: 0, repetitions: 0, lapses: 0, due: now, updatedAt: now };
}

const clampEase = (ease: number): number => Math.round(Math.max(MIN_EASE, ease) * 100) / 100;

function nextInterval(card: VocabCard, rating: ReviewRating, ease: number): number {
  const previous = card.intervalDays;
  if (rating === Rating.hard) return Math.max(1, Math.round(previous * 1.2));
  if (rating === Rating.easy) return card.repetitions === 0 ? 4 : Math.round(Math.max(previous + 1, previous * ease) * 1.3);
  if (card.repetitions === 0) return 1;
  if (card.repetitions === 1) return 3;
  return Math.max(previous + 1, Math.round(previous * ease));
}

/**
 * Applies one answer. Answering early (the word is not due yet) never inflates the schedule:
 * extra practice is welcome, but only a review that was actually due counts as spaced repetition.
 */
export function review(card: VocabCard, rating: ReviewRating, now: number): VocabCard {
  const reviewed: VocabCard = { ...card, lastReviewedAt: now, updatedAt: now };
  if (rating === Rating.again) {
    return { ...reviewed, status: 'learning', ease: clampEase(card.ease - 0.2), intervalDays: 0, repetitions: 0, lapses: card.lapses + 1, due: now + RETRY_AFTER };
  }
  if (!isDue(card, now)) return reviewed;

  const ease = clampEase(card.ease + (rating === Rating.hard ? -0.15 : rating === Rating.easy ? 0.15 : 0));
  const intervalDays = Math.min(MAX_INTERVAL_DAYS, nextInterval(card, rating, ease));
  return {
    ...reviewed,
    status: intervalDays >= KNOWN_AFTER_DAYS ? 'known' : 'learning',
    ease,
    intervalDays,
    repetitions: card.repetitions + 1,
    due: now + intervalDays * DAY,
  };
}

/** The old seven-step ladder's intervals in days, to carry saved progress over to SM-2. */
const LADDER_DAYS = [0, 0, 1, 3, 7, 16, 35] as const;

/** The SM-2 fields for a card saved under the ladder: the same mapping the server migration used. */
export function fromLadder(stage: number): Pick<VocabCard, 'status' | 'ease' | 'intervalDays' | 'repetitions'> {
  const step = Math.max(0, Math.min(stage, LADDER_DAYS.length - 1));
  const intervalDays = LADDER_DAYS[step];
  return {
    status: step === 0 ? 'new' : intervalDays >= KNOWN_AFTER_DAYS ? 'known' : 'learning',
    ease: START_EASE,
    intervalDays,
    repetitions: step,
  };
}
