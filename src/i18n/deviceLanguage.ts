import { getLocales } from 'expo-localization';

import type { Language } from './index';

const SUPPORTED: readonly Language[] = ['uz', 'ru', 'en'];

/** Phones set to these languages almost always belong to people who read Russian. */
const RUSSIAN_READERS = new Set(['kk', 'ky', 'tg', 'tk', 'be', 'uk', 'az', 'hy', 'ka']);

/**
 * The app language for a fresh install: the first of the phone's preferred languages the app
 * speaks. A phone in a neighbouring language falls back to Russian, anything else to English.
 */
export function deviceLanguage(): Language {
  const codes = getLocales().map(({ languageCode }) => languageCode?.toLowerCase() ?? '');
  const supported = codes.find((code): code is Language => SUPPORTED.includes(code as Language));
  if (supported) return supported;
  return codes.some((code) => RUSSIAN_READERS.has(code)) ? 'ru' : 'en';
}
