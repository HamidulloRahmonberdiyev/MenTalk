import type { FontAwesome6 } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { Language } from '@/i18n';
import type { StudyLanguage } from '@/services/learning';
import type { Gender, LearnerExperience, LearnerLevel, LearningFocus, LearningGoal, NativeLanguage, ReferralSource } from '@/types';

export const STUDY_OPTIONS: readonly { id: StudyLanguage; emoji: string }[] = [
  { id: 'ru', emoji: '🇷🇺' },
  { id: 'en', emoji: '🇬🇧' },
];

export interface NativeOption {
  id: NativeLanguage;
  emoji: string;
  /** The language's name in itself, so a speaker finds theirs whatever the screen's language. */
  endonym: string | null;
  /**
   * The interface language explanations default to: the language itself where the app has it,
   * otherwise the one its speakers most often read (Russian across most of Central Asia).
   */
  explainIn: Language | null;
}

export const NATIVE_OPTIONS: readonly NativeOption[] = [
  { id: 'uz', emoji: '🇺🇿', endonym: 'O‘zbekcha', explainIn: 'uz' },
  { id: 'ru', emoji: '🇷🇺', endonym: 'Русский', explainIn: 'ru' },
  { id: 'en', emoji: '🇬🇧', endonym: 'English', explainIn: 'en' },
  { id: 'kk', emoji: '🇰🇿', endonym: 'Қазақша', explainIn: 'ru' },
  { id: 'ky', emoji: '🇰🇬', endonym: 'Кыргызча', explainIn: 'ru' },
  { id: 'tg', emoji: '🇹🇯', endonym: 'Тоҷикӣ', explainIn: 'ru' },
  { id: 'tk', emoji: '🇹🇲', endonym: 'Türkmençe', explainIn: 'ru' },
  { id: 'kaa', emoji: '🏜️', endonym: 'Qaraqalpaqsha', explainIn: 'uz' },
  { id: 'az', emoji: '🇦🇿', endonym: 'Azərbaycanca', explainIn: null },
  { id: 'tr', emoji: '🇹🇷', endonym: 'Türkçe', explainIn: null },
  { id: 'other', emoji: '🌐', endonym: null, explainIn: null },
];

/** The languages the app itself speaks, each named in itself. */
export const INTERFACE_OPTIONS: readonly { id: Language; label: string }[] = [
  { id: 'uz', label: 'O‘zbekcha' },
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
];

export const isInterfaceLanguage = (value: NativeLanguage): value is Language => INTERFACE_OPTIONS.some(({ id }) => id === value);

export const GENDERS: readonly { id: Gender; emoji: string }[] = [
  { id: 'male', emoji: '👨' },
  { id: 'female', emoji: '👩' },
  { id: 'unspecified', emoji: '🙂' },
];

export interface LevelLook {
  id: LearnerLevel;
  emoji: string;
  /** The matching CEFR band, shown next to the name. */
  cefr: string;
  gradient: readonly [string, string];
  edge: string;
}

export const LEVELS: readonly LevelLook[] = [
  { id: 'beginner', emoji: '🌱', cefr: 'A1', gradient: ['#6EE7A8', '#22B573'], edge: '#178A57' },
  { id: 'elementary', emoji: '🌿', cefr: 'A2', gradient: ['#6FC3F5', '#2AABEE'], edge: '#1A84BF' },
  { id: 'intermediate', emoji: '🌳', cefr: 'B1', gradient: ['#B79BFF', '#7B4FE0'], edge: '#5A35B8' },
  { id: 'advanced', emoji: '🚀', cefr: 'B2+', gradient: ['#FFC069', '#F5821F'], edge: '#C2610F' },
];

export const levelLook = (level: LearnerLevel): LevelLook => LEVELS.find((look) => look.id === level) ?? LEVELS[0];

export const EXPERIENCES: readonly { id: LearnerExperience; emoji: string }[] = [
  { id: 'none', emoji: '🐣' },
  { id: 'school', emoji: '🏫' },
  { id: 'self_taught', emoji: '📱' },
  { id: 'courses', emoji: '👩‍🏫' },
  { id: 'immersion', emoji: '🌆' },
];

/** Brand colours stay as they are; `null` follows the theme, as TikTok's black would vanish on dark. */
export const REFERRAL_SOURCES: readonly { id: ReferralSource; icon: ComponentProps<typeof FontAwesome6>['name']; color: string | null }[] = [
  { id: 'instagram', icon: 'instagram', color: '#E4405F' },
  { id: 'telegram', icon: 'telegram', color: '#26A5E4' },
  { id: 'tiktok', icon: 'tiktok', color: null },
  { id: 'youtube', icon: 'youtube', color: '#FF0000' },
  { id: 'friend', icon: 'user-group', color: null },
  { id: 'search', icon: 'google', color: '#4285F4' },
  { id: 'store', icon: 'mobile-screen', color: null },
  { id: 'other', icon: 'ellipsis', color: null },
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

export const FOCUS: readonly { id: LearningFocus; emoji: string }[] = [
  { id: 'speaking', emoji: '💬' },
  { id: 'listening', emoji: '👂' },
  { id: 'vocabulary', emoji: '📚' },
  { id: 'grammar', emoji: '🧩' },
  { id: 'pronunciation', emoji: '🎙️' },
  { id: 'confidence', emoji: '💪' },
];
