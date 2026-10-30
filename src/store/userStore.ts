import { create } from 'zustand';

import { INITIAL_USER } from '@/mocks/user';
import { useSettingsStore } from '@/store/settingsStore';
import type { StudyLanguage } from '@/services/learning';
import type { CountryCode, Gender, LearningGoal, LearnerLevel, ScenarioId, UserProfile } from '@/types';

export interface OnboardingData {
  studyLanguage: StudyLanguage;
  name: string;
  gender: Gender;
  country: CountryCode;
  birthDate: string;
  level: LearnerLevel;
  goals: LearningGoal[];
  dailyGoalMinutes: number;
}

interface UserState extends UserProfile {
  setName: (name: string) => void;
  /** Replaces profile fields with what the server holds. */
  hydrate: (profile: Partial<UserProfile>) => void;
  reset: () => void;
  completeOnboarding: (data: OnboardingData) => void;
  recordConversation: (scenarioId: ScenarioId, durationSec: number, score: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  ...INITIAL_USER,
  setName: (name) => set({ name }),
  hydrate: (profile) => set(profile),
  reset: () => set({ ...INITIAL_USER }),
  completeOnboarding: ({ studyLanguage, ...profile }) => {
    useSettingsStore.getState().setStudyLanguage(studyLanguage);
    set({ ...profile, onboarded: true });
  },
  recordConversation: (scenarioId, durationSec, score) =>
    set((state) => ({
      lastScenarioId: scenarioId,
      minutesToday: state.minutesToday + durationSec / 60,
      history: [{ id: `${Date.now()}`, scenarioId, durationSec, score, date: Date.now() }, ...state.history],
    })),
}));
