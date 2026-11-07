import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isApiConfigured } from '@/services/api/config';
import { endpoints } from '@/services/api/endpoints';
import type { StudyLanguage } from '@/services/learning';

import { phrasesFor, type PhraseLevel } from './phrases';

/** Lines fetched per request: few, since the server marks every line it hands out as seen. */
const BATCH = 5;
/** Fetch more while this many are still queued, so the next line is always there instantly. */
const REFILL_AT = 2;

export interface QueuedPhrase {
  /** Server id; null for a built-in line used without a server. */
  id: number | null;
  text: string;
}

interface PhraseQueueState {
  /** Upcoming lines per language and level; the first one is on screen until the learner moves on. */
  queues: Record<string, QueuedPhrase[]>;
  /** Built-in lines already given out, per language and level; only used without a server. */
  localSeen: Record<string, string[]>;
  advance: (key: string) => void;
  append: (key: string, phrases: QueuedPhrase[]) => void;
  setLocalSeen: (key: string, texts: string[]) => void;
}

export const queueKey = (language: StudyLanguage, level: PhraseLevel) => `${language}|${level}`;

/**
 * Kept on the device because the server marks lines seen as it hands them out: a line fetched but
 * not read yet must survive the app being closed, or it would be skipped for good.
 */
export const usePhraseQueue = create<PhraseQueueState>()(
  persist(
    (set) => ({
      queues: {},
      localSeen: {},
      advance: (key) => set((state) => ({ queues: { ...state.queues, [key]: (state.queues[key] ?? []).slice(1) } })),
      append: (key, phrases) =>
        set((state) => {
          const current = state.queues[key] ?? [];
          const queued = new Set(current.map((item) => item.text));
          return { queues: { ...state.queues, [key]: [...current, ...phrases.filter((item) => !queued.has(item.text))] } };
        }),
      setLocalSeen: (key, texts) => set((state) => ({ localSeen: { ...state.localSeen, [key]: texts } })),
    }),
    {
      name: 'pronunciation-phrases',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ queues, localSeen }) => ({ queues, localSeen }),
    },
  ),
);

/** Fetching before the saved queue loads would have it overwritten, and those lines lost. */
function hydrated(): Promise<void> {
  if (usePhraseQueue.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = usePhraseQueue.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

const shuffled = <T>(items: readonly T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** Built-in lines not given out yet; once all were, a new round starts (still skipping queued ones). */
function pickLocal(language: StudyLanguage, level: PhraseLevel, queued: QueuedPhrase[]): QueuedPhrase[] {
  const key = queueKey(language, level);
  const { localSeen, setLocalSeen } = usePhraseQueue.getState();
  const inQueue = new Set(queued.map((item) => item.text));
  const all = phrasesFor(language, level).filter((text) => !inQueue.has(text));
  const seen = new Set(localSeen[key] ?? []);
  let fresh = all.filter((text) => !seen.has(text));
  if (!fresh.length) {
    seen.clear();
    fresh = all;
  }
  const picked = shuffled(fresh).slice(0, BATCH);
  setLocalSeen(key, [...seen, ...picked]);
  return picked.map((text) => ({ id: null, text }));
}

async function load(language: StudyLanguage, level: PhraseLevel, queued: QueuedPhrase[]): Promise<QueuedPhrase[]> {
  if (isApiConfigured) {
    try {
      const phrases = await endpoints.nextPhrases(language, level, BATCH);
      if (phrases.length) return phrases.map(({ id, text }) => ({ id, text }));
    } catch (error) {
      // Offline or signed out: the built-in lines keep practice going.
      if (__DEV__) console.warn('Could not load phrases, using built-in ones:', error);
    }
  }
  return pickLocal(language, level, queued);
}

const inFlight = new Map<string, Promise<void>>();

/** Tops the queue up when it runs low. Concurrent calls share one request. */
export function refillPhrases(language: StudyLanguage, level: PhraseLevel): Promise<void> {
  const key = queueKey(language, level);
  const running = inFlight.get(key);
  if (running) return running;

  const task = (async () => {
    await hydrated();
    const queued = usePhraseQueue.getState().queues[key] ?? [];
    if (queued.length > REFILL_AT) return;
    usePhraseQueue.getState().append(key, await load(language, level, queued));
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}
