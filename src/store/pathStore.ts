import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { StudyLanguage } from '@/services/learning';
import type { ScenarioId } from '@/types';

/** What the learner has done on one stage of the path. Scores are 0–10. */
export interface StageProgress {
  best: number;
  attempts: number;
}

export type LanguageProgress = Partial<Record<ScenarioId, StageProgress>>;

interface PathState {
  /** Progress per studied language: passing a stage in Russian does not open it in English. */
  progress: Partial<Record<StudyLanguage, LanguageProgress>>;
  /** Takes what the server holds, keeping anything newer the device recorded itself. */
  hydrate: (language: StudyLanguage, stages: Partial<Record<ScenarioId, StageProgress>>) => void;
  /** A finished conversation, recorded at once so the path moves on without waiting for the server. */
  record: (language: StudyLanguage, scenarioId: ScenarioId, score: number) => void;
  reset: () => void;
}

export const usePathStore = create<PathState>()(
  persist(
    (set) => ({
      progress: {},
      hydrate: (language, stages) =>
        set((state) => {
          const local = state.progress[language] ?? {};
          const merged: LanguageProgress = { ...local };
          for (const [id, server] of Object.entries(stages) as [ScenarioId, StageProgress][]) {
            const mine = local[id];
            merged[id] = mine
              ? { best: Math.max(mine.best, server.best), attempts: Math.max(mine.attempts, server.attempts) }
              : server;
          }
          return { progress: { ...state.progress, [language]: merged } };
        }),
      record: (language, scenarioId, score) =>
        set((state) => {
          const current = state.progress[language] ?? {};
          const before = current[scenarioId];
          const next: StageProgress = {
            best: Math.max(before?.best ?? 0, score),
            attempts: (before?.attempts ?? 0) + 1,
          };
          return { progress: { ...state.progress, [language]: { ...current, [scenarioId]: next } } };
        }),
      reset: () => set({ progress: {} }),
    }),
    { name: 'path', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
