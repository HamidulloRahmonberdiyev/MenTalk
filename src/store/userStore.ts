import { create } from 'zustand';

import { INITIAL_USER } from '@/mocks/user';
import type { ScenarioId, UserProfile } from '@/types';

interface UserState extends UserProfile {
  recordConversation: (scenarioId: ScenarioId, durationSec: number, score: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  ...INITIAL_USER,
  recordConversation: (scenarioId, durationSec, score) =>
    set((state) => ({
      lastScenarioId: scenarioId,
      minutesToday: state.minutesToday + durationSec / 60,
      history: [{ id: `${Date.now()}`, scenarioId, durationSec, score, date: Date.now() }, ...state.history],
    })),
}));
