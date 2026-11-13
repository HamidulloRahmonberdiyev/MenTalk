import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { isApiConfigured } from '@/services/api/config';
import { endpoints, type ApiLeaderboard, type LeaderboardPeriod } from '@/services/api/endpoints';
import { useUserStore } from '@/store/userStore';

export type LeaderboardStatus = 'loading' | 'ready' | 'failed';

/** The same reward the server gives a finished talk (10 + 2 per point of a 0–10 score), for demo mode. */
const localConversationXp = (score: number) => 10 + Math.round(Math.max(0, Math.min(10, score))) * 2;

/** Boards fetched in this app session: shown at once next time, then refreshed in place. */
const cache = new Map<string, ApiLeaderboard>();
const inFlight = new Map<string, Promise<ApiLeaderboard>>();

function load(period: LeaderboardPeriod, limit: number): Promise<ApiLeaderboard> {
  const key = `${period}:${limit}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = endpoints
    .leaderboard(period, limit)
    .then((board) => {
      cache.set(key, board);
      return board;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

interface Loaded {
  key: string;
  board?: ApiLeaderboard;
  failed: boolean;
}

/**
 * The leaderboard from the server, fetched again whenever its screen comes into view so XP earned
 * in a lesson shows on the way back. Without a server only the learner's own row can be shown.
 */
export function useLeaderboard(
  period: LeaderboardPeriod,
  limit: number,
): { board: ApiLeaderboard | undefined; status: LeaderboardStatus; retry: () => void } {
  const key = `${period}:${limit}`;
  const history = useUserStore((state) => state.history);
  const [loaded, setLoaded] = useState<Loaded>({ key, failed: false });
  const wanted = useRef(key);

  const fetchBoard = useCallback(() => {
    wanted.current = key;
    if (!isApiConfigured) return;
    load(period, limit).then(
      (board) => {
        if (wanted.current === key) setLoaded({ key, board, failed: false });
      },
      () => {
        if (wanted.current === key) setLoaded({ key, board: cache.get(key), failed: true });
      },
    );
  }, [key, period, limit]);

  useFocusEffect(fetchBoard);

  const retry = useCallback(() => {
    setLoaded({ key, failed: false });
    fetchBoard();
  }, [fetchBoard, key]);

  if (!isApiConfigured) {
    const xp = history.reduce((sum, entry) => sum + localConversationXp(entry.score), 0);
    return { board: { period, since: null, top: [], me: { rank: null, xp } }, status: 'ready', retry };
  }
  const own = loaded.key === key ? loaded : null;
  // Stale data beats an error screen: only fail when there is nothing at all to show.
  const board = own?.board ?? cache.get(key);
  const status: LeaderboardStatus = board ? 'ready' : own?.failed ? 'failed' : 'loading';
  return { board, status, retry };
}
