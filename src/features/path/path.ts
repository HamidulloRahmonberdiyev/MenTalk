import type { LanguageProgress } from '@/store/pathStore';
import type { Scenario } from '@/types';

/** Same rules as the server's `config/path.php`: a stage is passed at 6/10; stars at 6, 8 and 9. */
export const PASS_SCORE = 6;
const STAR_SCORES = [6, 8, 9] as const;

export type StageStatus = 'passed' | 'open' | 'locked';

export interface PathStage {
  /** 1-based position on the path. */
  number: number;
  scenario: Scenario;
  status: StageStatus;
  best: number | null;
  attempts: number;
  stars: number;
}

export const starsFor = (score: number | null): number =>
  score === null ? 0 : STAR_SCORES.filter((min) => score >= min).length;

/**
 * Lays the scenarios out as stages: every passed one stays passed, the first one not yet passed is
 * open, and everything after it waits behind a lock.
 */
export function buildPath(scenarios: readonly Scenario[], progress: LanguageProgress = {}): PathStage[] {
  let openFound = false;
  return scenarios.map((scenario, index) => {
    const entry = progress[scenario.id];
    const best = entry?.best ?? null;
    const passed = best !== null && best >= PASS_SCORE;
    const status: StageStatus = passed ? 'passed' : openFound ? 'locked' : 'open';
    if (status === 'open') openFound = true;
    return { number: index + 1, scenario, status, best, attempts: entry?.attempts ?? 0, stars: starsFor(best) };
  });
}
