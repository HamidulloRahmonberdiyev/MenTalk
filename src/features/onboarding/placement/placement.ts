import type { LearnerLevel } from '@/types';

export const BAND_COUNT = 3;
export const PER_BAND = 4;
/** Right answers needed in a band to reach its level. */
const PASS = 3;
const LEVELS: readonly LearnerLevel[] = ['beginner', 'elementary', 'intermediate', 'advanced'];

/** Where the learner is in the test. Bands are taken in order and the test stops at the first failed one. */
export interface PlacementState {
  band: number;
  /** Questions answered in the current band. */
  index: number;
  /** Right answers per band. */
  right: readonly number[];
  finished: boolean;
}

export interface PlacementResult {
  level: LearnerLevel;
  correct: number;
  /** Right answers as a share of the whole test, 0–100, as the server stores it. */
  score: number;
}

export const PLACEMENT_START: PlacementState = { band: 0, index: 0, right: Array(BAND_COUNT).fill(0), finished: false };

/**
 * Records one answer ("I don't know" counts as wrong). A band ends as soon as it can no longer be
 * passed, so a beginner sees two or three questions instead of the whole test.
 */
export function answerPlacement(state: PlacementState, correct: boolean): PlacementState {
  const right = state.right.map((count, band) => (band === state.band && correct ? count + 1 : count));
  const index = state.index + 1;
  const failed = index - right[state.band] > PER_BAND - PASS;

  if (failed) return { ...state, right, index, finished: true };
  if (index < PER_BAND) return { ...state, right, index };
  if (state.band + 1 < BAND_COUNT) return { band: state.band + 1, index: 0, right, finished: false };
  return { ...state, right, index, finished: true };
}

/** Questions answered so far, for the progress bar. */
export const placementAnswered = (state: PlacementState): number => state.band * PER_BAND + state.index;

export function placementResult(state: PlacementState): PlacementResult {
  const passed = state.right.filter((count) => count >= PASS).length;
  const correct = state.right.reduce((sum, count) => sum + count, 0);
  return { level: LEVELS[passed], correct, score: Math.round((correct / (BAND_COUNT * PER_BAND)) * 100) };
}
