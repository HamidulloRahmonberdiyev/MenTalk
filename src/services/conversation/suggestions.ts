import type { StudyLanguage } from '@/services/learning';
import type { WordSuggestion } from '@/types';

const MAX_NEW_WORDS = 5;

interface RawWord {
  word?: string;
  form?: string;
  translation?: string;
  example?: string;
}

/** Keeps only complete entries and trims them into saveable suggestions of `language`. */
export function toSuggestions(raw: RawWord[] | undefined, language: StudyLanguage): WordSuggestion[] {
  return (raw ?? [])
    .filter((item) => item?.word?.trim() && item.translation?.trim())
    .slice(0, MAX_NEW_WORDS)
    .map((item) => {
      const word = item.word!.trim().toLowerCase();
      const form = item.form?.trim().toLowerCase();
      return {
        word,
        translation: item.translation!.trim(),
        language,
        example: item.example?.trim() || undefined,
        form: form && form !== word ? form : undefined,
      };
    });
}
