import type { LanguageCode } from '@/types';

export interface TranslateLanguage {
  code: LanguageCode;
  /** Name in the language itself, so it is recognisable to speakers of any UI language. */
  name: string;
  /** Name used in prompts. */
  english: string;
  flag: string;
}

export const TRANSLATE_LANGUAGES: readonly TranslateLanguage[] = [
  { code: 'uz', name: 'O‘zbekcha', english: 'Uzbek', flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', english: 'Russian', flag: '🇷🇺' },
  { code: 'en', name: 'English', english: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', english: 'Turkish', flag: '🇹🇷' },
  { code: 'kk', name: 'Қазақша', english: 'Kazakh', flag: '🇰🇿' },
  { code: 'ar', name: 'العربية', english: 'Arabic', flag: '🇸🇦' },
  { code: 'de', name: 'Deutsch', english: 'German', flag: '🇩🇪' },
  { code: 'ko', name: '한국어', english: 'Korean', flag: '🇰🇷' },
];

export const languageOf = (code: LanguageCode): TranslateLanguage =>
  TRANSLATE_LANGUAGES.find((item) => item.code === code) ?? TRANSLATE_LANGUAGES[0];
