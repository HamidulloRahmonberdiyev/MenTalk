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

/**
 * Translates into the UI language. Texts that depend on the language being learned are written once
 * for Russian under `key` and overridden per language under `key@<language>` (e.g.
 * `'onb.level.title@en'`), so callers never branch on the studied language. `{tutor}` is always
 * available and names the tutor of the studied language.
 */
export function useT(): Translate {
  const language = useSettingsStore((state) => state.language);
  const study = useSettingsStore((state) => state.studyLanguage);

  return useCallback<Translate>(
    (key, params) => {
      const dictionary = DICTIONARIES[language] as Record<string, string | undefined>;
      const text = dictionary[`${key}@${study}`] ?? dictionary[key] ?? key;
      const values: Record<string, string | number> = { tutor: dictionary[`tutor.name@${study}`] ?? dictionary['tutor.name'] ?? '', ...params };
      return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
    },
    [language, study],
  );
}
