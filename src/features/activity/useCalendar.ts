import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiConfigured } from '@/services/api/config';
import { endpoints, type ApiCalendar } from '@/services/api/endpoints';
import { useUserStore } from '@/store/userStore';

import { useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { localCalendar } from './calendar';

export type CalendarStatus = 'loading' | 'ready' | 'failed';

/**
 * Months already fetched in this app session. Past months never change, so paging back and forth
 * is instant; the current one is fetched again whenever its screen comes into view.
 */
const cache = new Map<string, ApiCalendar>();
const inFlight = new Map<string, Promise<ApiCalendar>>();

function load(month: string): Promise<ApiCalendar> {
  const pending = inFlight.get(month);
  if (pending) return pending;
  const request = endpoints
    .calendar(month)
    .then((calendar) => {
      cache.set(month, calendar);
      return calendar;
    })
    .finally(() => inFlight.delete(month));
  inFlight.set(month, request);
  return request;
}

/** A cached month is final unless it is the current one, where today can still change. */
const isFinal = (month: string) => {
  const cached = cache.get(month);
  return cached !== undefined && !cached.today.startsWith(month);
};

interface Loaded {
  month: string;
  calendar?: ApiCalendar;
  failed: boolean;
}

/** The practice calendar for `month` (`YYYY-MM`), from the server, or from the device in demo mode. */
export function useCalendar(month: string): { calendar: ApiCalendar | undefined; status: CalendarStatus; retry: () => void } {
  const history = useUserStore((state) => state.history);
  const goal = useUserStore((state) => state.dailyGoalMinutes);
  const streak = useVocabularyStore(visibleStreak);
  const [loaded, setLoaded] = useState<Loaded>({ month, failed: false });
  const wanted = useRef(month);

  const fetchMonth = useCallback((target: string) => {
    if (!isApiConfigured) return;
    load(target).then(
      (calendar) => {
        if (wanted.current === target) setLoaded({ month: target, calendar, failed: false });
      },
      () => {
        if (wanted.current === target) setLoaded({ month: target, calendar: cache.get(target), failed: true });
      },
    );
  }, []);

  useEffect(() => {
    wanted.current = month;
    if (!isFinal(month)) fetchMonth(month);
  }, [month, fetchMonth]);

  // Back from a lesson: today's cell should already show it.
  useFocusEffect(
    useCallback(() => {
      if (!isFinal(wanted.current)) fetchMonth(wanted.current);
    }, [fetchMonth]),
  );

  const retry = useCallback(() => {
    setLoaded({ month, failed: false });
    fetchMonth(month);
  }, [fetchMonth, month]);

  if (!isApiConfigured) {
    return { calendar: localCalendar(month, history, goal, streak), status: 'ready', retry };
  }
  const own = loaded.month === month ? loaded : null;
  // Stale data beats an error screen: only fail when there is nothing at all to show.
  const calendar = own?.calendar ?? cache.get(month);
  const status: CalendarStatus = calendar ? 'ready' : own?.failed ? 'failed' : 'loading';
  return { calendar, status, retry };
}
