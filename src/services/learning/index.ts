import { english } from './english';
import { russian } from './russian';
import type { StudyLanguage, StudyLanguagePack } from './types';

export type { StudyLanguage, StudyLanguagePack } from './types';

const PACKS: Readonly<Record<StudyLanguage, StudyLanguagePack>> = { ru: russian, en: english };

/** Languages offered for learning, in the order they are shown. */
export const STUDY_LANGUAGES: readonly StudyLanguage[] = ['ru', 'en'];

/** What profiles and cards made before English existed are learning. */
export const DEFAULT_STUDY_LANGUAGE: StudyLanguage = 'ru';

export const isStudyLanguage = (value: unknown): value is StudyLanguage => STUDY_LANGUAGES.includes(value as StudyLanguage);

export const studyLanguagePack = (id: StudyLanguage | null | undefined): StudyLanguagePack => PACKS[id ?? DEFAULT_STUDY_LANGUAGE];

/** The language a saved word or phrase is written in, told apart by each pack's alphabet; null when none matches. */
export function studyLanguageOfWord(text: string): StudyLanguage | null {
  const words = text.trim().split(/\s+/);
  return (
    STUDY_LANGUAGES.find((id) => {
      const pattern = new RegExp(`^(?:${PACKS[id].wordPattern.source})$`);
      return words.every((word) => pattern.test(word));
    }) ?? null
  );
}
