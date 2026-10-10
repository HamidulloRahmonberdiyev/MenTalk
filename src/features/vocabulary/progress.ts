/** Daily streak and XP rules: the game layer, kept separate from the learning schedule. */

const pad = (value: number) => String(value).padStart(2, '0');

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function previousDay(time: number): string {
  const date = new Date(time);
  date.setDate(date.getDate() - 1);
  return dayKey(date.getTime());
}

/** The streak as it stands today: a missed day resets it, but only once that day has fully passed. */
export function currentStreak(streak: number, lastDay: string | null, now: number): number {
  if (!lastDay) return 0;
  return lastDay === dayKey(now) || lastDay === previousDay(now) ? streak : 0;
}

/** The streak after finishing a round today. */
export function streakAfterRound(streak: number, lastDay: string | null, now: number): number {
  if (lastDay === dayKey(now)) return Math.max(streak, 1);
  return lastDay === previousDay(now) ? streak + 1 : 1;
}

export const BASE_XP = 10;
export const PERFECT_BONUS = 20;
const MAX_COMBO_BONUS = 5;

/** XP for a correct answer; `combo` counts correct answers in a row including this one. */
export const xpForAnswer = (combo: number): number => BASE_XP + Math.min(Math.max(combo - 1, 0), MAX_COMBO_BONUS) * 2;
