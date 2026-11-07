import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isApiConfigured } from '@/services/api/config';
import { ApiError, NetworkError } from '@/services/api/http';
import { endpoints, type ApiMistakeAnswer, type ApiMistakeSummary } from '@/services/api/endpoints';
import { getToken } from '@/services/api/tokenStore';
import type { StudyLanguage } from '@/services/learning';

/** The server takes a round of at most this many answers. */
const MAX_PER_REQUEST = 30;
/** A device offline for long enough keeps only the latest answers; older ones would barely move a schedule. */
const MAX_PENDING = 300;

interface MistakesState {
  /** Last known counts per study language: the home card shows them at once, also offline. */
  summaries: Partial<Record<StudyLanguage, ApiMistakeSummary>>;
  /** Drill answers the server has not confirmed yet, oldest first. */
  pending: ApiMistakeAnswer[];
  setSummary: (language: StudyLanguage, summary: ApiMistakeSummary) => void;
  enqueue: (answers: ApiMistakeAnswer[]) => void;
  /** Drops answers the server has taken (or refused for good). */
  settle: (answers: ApiMistakeAnswer[]) => void;
  clear: () => void;
}

const answerKey = (answer: ApiMistakeAnswer) => `${answer.id}@${answer.answered_at}`;

export const useMistakesStore = create<MistakesState>()(
  persist(
    (set) => ({
      summaries: {},
      pending: [],
      setSummary: (language, summary) => set((state) => ({ summaries: { ...state.summaries, [language]: summary } })),
      enqueue: (answers) =>
        set((state) => {
          const known = new Set(state.pending.map(answerKey));
          return { pending: [...state.pending, ...answers.filter((answer) => !known.has(answerKey(answer)))].slice(-MAX_PENDING) };
        }),
      settle: (answers) =>
        set((state) => {
          const done = new Set(answers.map(answerKey));
          return { pending: state.pending.filter((answer) => !done.has(answerKey(answer))) };
        }),
      clear: () => set({ summaries: {}, pending: [] }),
    }),
    {
      name: 'mistakes',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

let flushing: Promise<number> | null = null;

/**
 * Sends every drill answer still waiting, a round at a time. Returns the XP the server granted.
 * The server ignores answers it already logged, so a batch sent twice (the app closed before the
 * reply arrived) costs nothing. Offline, the answers stay queued for the next try.
 */
export function flushMistakeAnswers(): Promise<number> {
  if (!isApiConfigured) return Promise.resolve(0);
  flushing ??= (async () => {
    if (!useMistakesStore.persist.hasHydrated()) await new Promise<void>((resolve) => useMistakesStore.persist.onFinishHydration(() => resolve()));
    if (!(await getToken())) return 0;

    let xp = 0;
    for (;;) {
      const batch = useMistakesStore.getState().pending.slice(0, MAX_PER_REQUEST);
      if (batch.length === 0) return xp;
      try {
        xp += (await endpoints.reviewMistakes(batch)).xp;
      } catch (error) {
        // Offline or the server is down: keep them. Refused as invalid (e.g. a 422): sending them
        // again would fail the same way and block every answer behind them.
        if (error instanceof NetworkError || !(error instanceof ApiError) || error.status >= 500 || error.status === 429 || error.status === 401) return xp;
      }
      useMistakesStore.getState().settle(batch);
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Fetches the counts for one language and keeps them; the stored ones stay on failure. */
export async function refreshMistakeSummary(language: StudyLanguage): Promise<ApiMistakeSummary | null> {
  if (!isApiConfigured || !(await getToken())) return null;
  try {
    const summary = await endpoints.mistakeSummary(language);
    useMistakesStore.getState().setSummary(language, summary);
    return summary;
  } catch {
    return useMistakesStore.getState().summaries[language] ?? null;
  }
}
