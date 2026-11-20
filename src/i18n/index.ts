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
 * available and names the tutor of the studied language: the male tutor (`tutor.name.male`) when the
 * learner picked a male voice, as the server names him in the chat.
 */
export function useT(): Translate {
  const language = useSettingsStore((state) => state.language);
  const study = useSettingsStore((state) => state.studyLanguage);
  const male = useSettingsStore((state) => state.tutorVoice?.gender === 'male');

  return useCallback<Translate>((key, params) => translateIn(language, study, male, key, params), [language, study, male]);
}

/** The same lookup as `useT()`, for code outside React (notification texts, services). */
export function translatorFor(language: Language, study: string = useSettingsStore.getState().studyLanguage): Translate {
  const male = useSettingsStore.getState().tutorVoice?.gender === 'male';
  return (key, params) => translateIn(language, study, male, key, params);
}

function translateIn(language: Language, study: string, male: boolean, key: TranslationKey, params?: Record<string, string | number>): string {
  const dictionary = DICTIONARIES[language] as Record<string, string | undefined>;
  const text = dictionary[`${key}@${study}`] ?? dictionary[key] ?? key;
  const female = dictionary[`tutor.name@${study}`] ?? dictionary['tutor.name'] ?? '';
  const tutor = male ? (dictionary[`tutor.name.male@${study}`] ?? dictionary['tutor.name.male'] ?? female) : female;
  const values: Record<string, string | number> = { tutor, ...params };
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}
