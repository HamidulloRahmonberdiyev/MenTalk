import { useMemo } from 'react';

import type { ApiCalendarDay } from '@/services/api/endpoints';

import { dateKey, levelOf, weekOf } from './calendar';
import { useCalendar } from './useCalendar';

export interface WeekDay {
  date: string;
  day: ApiCalendarDay | undefined;
  level: 0 | 1 | 2 | 3 | 4;
  today: boolean;
  future: boolean;
}

/**
 * A Monday-to-Sunday week, day by day, with the streak and the week's totals: this week by default,
 * or `weeksBack` weeks before it.
 */
export function useWeek(weeksBack = 0) {
  const now = new Date();
  const week = weekOf(dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - weeksBack * 7)));
  // A week that starts in last month needs that month's days too; the same month twice is one request.
  const first = useCalendar(week[0].slice(0, 7));
  const last = useCalendar(week[6].slice(0, 7));
  const calendar = last.calendar ?? first.calendar;
  const today = calendar?.today ?? dateKey(new Date());
  const goal = calendar?.goal_minutes ?? 0;

  const days = useMemo(() => {
    const byDate = new Map([...(first.calendar?.days ?? []), ...(last.calendar?.days ?? [])].map((day) => [day.date, day]));
    return week.map<WeekDay>((date) => ({
      date,
      day: byDate.get(date),
      level: levelOf(byDate.get(date), goal),
      today: date === today,
      future: date > today,
    }));
    // `week` is derived from today's date and `weeksBack`; `today` tracks the date, `week[0]` the offset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first.calendar, last.calendar, goal, today, week[0]]);

  return {
    days,
    streak: calendar?.streak ?? 0,
    bestStreak: calendar?.best_streak ?? 0,
    activeDays: days.filter((day) => day.level > 0).length,
    minutes: days.reduce((sum, day) => sum + (day.day?.minutes ?? 0), 0),
    loaded: calendar !== undefined,
  };
}
