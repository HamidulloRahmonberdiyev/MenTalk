import type { UserProfile } from '@/types';

export const INITIAL_USER: UserProfile = {
  name: 'Hamidullo',
  onboarded: false,
  gender: null,
  country: null,
  birthDate: null,
  level: null,
  goals: [],
  dailyGoalMinutes: 5,
  minutesToday: 0,
  lastScenarioId: 'cafe',
  history: [],
};
