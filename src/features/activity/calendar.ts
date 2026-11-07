import type { ApiCalendar, ApiCalendarDay } from '@/services/api/endpoints';
import type { HistoryEntry } from '@/types';

/** `YYYY-MM-DD` / `YYYY-MM` of a local date. */
const pad = (value: number) => String(value).padStart(2, '0');
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/** The month `delta` months away from `month` (`YYYY-MM`). */
export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split('-').map(Number);
  return monthKey(new Date(year, index - 1 + delta, 1));
}

/**
 * The month laid out as weeks starting on Monday, as in Uzbekistan and Russia: each week is seven
 * `YYYY-MM-DD` keys, with null for the days of the neighbouring months.
 */
export function monthWeeks(month: string): (string | null)[][] {
  const [year, index] = month.split('-').map(Number);
  const first = new Date(year, index - 1, 1);
  const length = new Date(year, index, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length }, (_, day) => `${month}-${pad(day + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** The Monday-to-Sunday week that holds `day` (`YYYY-MM-DD`). */
export function weekOf(day: string): string[] {
  const [year, month, date] = day.split('-').map(Number);
  const monday = new Date(year, month - 1, date - ((new Date(year, month - 1, date).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)));
}

/**
 * How much a day was practised, 0 (none) to 4 (daily goal met), for the colour of its cell. Drill-only
 * days (words, mistakes) earn XP but no talk minutes, and still count as practised.
 */
export function levelOf(day: ApiCalendarDay | undefined, goalMinutes: number): 0 | 1 | 2 | 3 | 4 {
  if (!day || day.minutes + day.xp + day.conversations === 0) return 0;
  if (day.goal_met || (goalMinutes > 0 && day.minutes >= goalMinutes)) return 4;
  const share = goalMinutes > 0 ? day.minutes / goalMinutes : 0;
  return share >= 0.66 ? 3 : share >= 0.33 ? 2 : 1;
}

/**
 * The same month built from the conversations kept on the device, for when there is no server
 * (demo mode). Only talks are known there, so XP stays zero.
 */
export function localCalendar(month: string, history: readonly HistoryEntry[], goalMinutes: number, streak: number): ApiCalendar {
  const byDay = new Map<string, ApiCalendarDay>();
  for (const entry of history) {
    const date = dateKey(new Date(entry.date));
    const day = byDay.get(date) ?? { date, minutes: 0, xp: 0, conversations: 0, goal_met: false };
    day.minutes += Math.round(entry.durationSec / 60);
    day.conversations += 1;
    day.goal_met = goalMinutes > 0 && day.minutes >= goalMinutes;
    byDay.set(date, day);
  }
  const all = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  const days = all.filter((day) => day.date.startsWith(month));
  return {
    month,
    today: dateKey(new Date()),
    since: all[0]?.date ?? null,
    goal_minutes: goalMinutes,
    streak,
    best_streak: Math.max(streak, longestRun(all.map((day) => day.date))),
    days,
    totals: {
      active_days: days.length,
      minutes: days.reduce((sum, day) => sum + day.minutes, 0),
      xp: 0,
      conversations: days.reduce((sum, day) => sum + day.conversations, 0),
    },
  };
}

/** Longest run of consecutive dates in a sorted list of `YYYY-MM-DD`. */
export function longestRun(dates: readonly string[]): number {
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of dates) {
    run = previous && nextDay(previous) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

const nextDay = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return dateKey(new Date(year, month - 1, day + 1));
};
