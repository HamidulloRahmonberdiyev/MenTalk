import type { StudyLanguage } from '@/services/learning';
import type { Gender, LearningGoal, LearnerLevel } from '@/types';

export const STUDY_OPTIONS: readonly { id: StudyLanguage; emoji: string }[] = [
  { id: 'ru', emoji: '🇷🇺' },
  { id: 'en', emoji: '🇬🇧' },
];

export const GENDERS: readonly { id: Gender; emoji: string }[] = [
  { id: 'male', emoji: '👨' },
  { id: 'female', emoji: '👩' },
  { id: 'unspecified', emoji: '🙂' },
];

export const LEVELS: readonly { id: LearnerLevel; emoji: string }[] = [
  { id: 'beginner', emoji: '🌱' },
  { id: 'elementary', emoji: '🌿' },
  { id: 'intermediate', emoji: '🌳' },
  { id: 'advanced', emoji: '🚀' },
];

export const GOALS: readonly { id: LearningGoal; emoji: string }[] = [
  { id: 'travel', emoji: '✈️' },
  { id: 'work', emoji: '💼' },
  { id: 'study', emoji: '🎓' },
  { id: 'relocation', emoji: '🏠' },
  { id: 'family', emoji: '❤️' },
  { id: 'fun', emoji: '🎬' },
];

export const DAILY: readonly { minutes: 5 | 10 | 15 | 20; emoji: string }[] = [
  { minutes: 5, emoji: '☕' },
  { minutes: 10, emoji: '🙂' },
  { minutes: 15, emoji: '💪' },
  { minutes: 20, emoji: '🔥' },
];
