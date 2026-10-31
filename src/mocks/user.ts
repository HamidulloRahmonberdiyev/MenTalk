import type { UserProfile } from '@/types';

export const INITIAL_USER: UserProfile = {
  name: 'Hamidullo',
  email: null,
  avatarUrl: null,
  avatarCustom: false,
  onboarded: false,
  gender: null,
  country: null,
  birthDate: null,
  level: null,
  levelSource: null,
  placementScore: null,
  experience: null,
  goals: [],
  focus: [],
  dailyGoalMinutes: 5,
  minutesToday: 0,
  lastScenarioId: 'cafe',
  history: [],
};
