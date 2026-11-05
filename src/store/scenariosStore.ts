import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SCENARIOS } from '@/mocks/scenarios';
import { isApiConfigured } from '@/services/api/config';
import type { ApiScenario } from '@/services/api/endpoints';
import type { IconName, LocalizedText, Scenario, ScenarioId } from '@/types';

function localized(text: Partial<LocalizedText> | null): LocalizedText | null {
  const fallback = text?.uz || text?.ru || text?.en;
  return fallback ? { uz: text?.uz || fallback, ru: text?.ru || fallback, en: text?.en || fallback } : null;
}

/** The icon name is typed by hand in the admin panel, and the seeded topics have no picture of their own. */
function toScenario(item: ApiScenario): Scenario[] {
  const title = localized(item.title);
  const subtitle = localized(item.subtitle);
  const [from, to, ...rest] = item.gradient ?? [];
  if (!title || !subtitle || !from || !to) return [];
  const bundled = SCENARIOS.find(({ id }) => id === item.id);
  return [
    {
      id: item.id,
      icon: item.icon in Ionicons.glyphMap ? (item.icon as IconName) : (bundled?.icon ?? 'chatbubbles'),
      tint: item.tint,
      gradient: [from, to, ...rest],
      image: item.image_url ? { uri: item.image_url } : bundled?.image,
      title,
      subtitle,
      languages: item.languages ?? [],
    },
  ];
}

function fromServer(remote: readonly ApiScenario[]): readonly Scenario[] {
  const scenarios = remote.flatMap(toScenario);
  return scenarios.length ? scenarios : SCENARIOS;
}

interface ScenariosState {
  /** What the server last sent. Only this is stored: bundled image ids change from build to build. */
  remote: readonly ApiScenario[] | null;
  /** The topics in path order; the bundled ones until the server has answered. */
  scenarios: readonly Scenario[];
  replace: (remote: readonly ApiScenario[]) => void;
}

export const useScenariosStore = create<ScenariosState>()(
  persist(
    (set) => ({
      remote: null,
      scenarios: SCENARIOS,
      // Unchanged answers keep the same objects, so a sync does not re-render every screen.
      replace: (remote) =>
        set((state) => (JSON.stringify(state.remote) === JSON.stringify(remote) ? state : { remote, scenarios: fromServer(remote) })),
    }),
    {
      name: 'scenarios',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ remote }) => ({ remote }),
      merge: (persisted, current) => {
        const remote = (persisted as Pick<ScenariosState, 'remote'> | undefined)?.remote ?? null;
        // Without a server the chat runs on the bundled briefs and scripts, which know only the bundled topics.
        return remote && isApiConfigured ? { ...current, remote, scenarios: fromServer(remote) } : current;
      },
    },
  ),
);

export const scenarioById = (id: ScenarioId): Scenario | undefined =>
  useScenariosStore.getState().scenarios.find((scenario) => scenario.id === id);

/** Undefined for a topic the server no longer offers; past conversations can still name one. */
export const useScenario = (id: ScenarioId | undefined): Scenario | undefined =>
  useScenariosStore((state) => state.scenarios.find((scenario) => scenario.id === id));
