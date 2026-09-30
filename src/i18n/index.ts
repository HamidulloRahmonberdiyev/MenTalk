import { useCallback } from 'react';

import { useSettingsStore } from '@/store/settingsStore';

import { en, type TranslationKey } from './locales/en';
import { ru } from './locales/ru';
import { uz } from './locales/uz';

export type { TranslationKey };

export type Language = 'uz' | 'ru' | 'en';

export const LANGUAGES: readonly { code: Language; label: string; flag: string }[] = [
  { code: 'uz', label: 'O‘zbekcha', flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { uz, ru, en };

export type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

export function useT(): Translate {
  const language = useSettingsStore((state) => state.language);

  return useCallback<Translate>(
    (key, params) =>
      DICTIONARIES[language][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? '')),
    [language],
  );
}
