import { isStudyLanguage, studyLanguageOfWord, type StudyLanguage } from '@/services/learning';
import type { SavedTranslation, WordSuggestion } from '@/types';

/** The server's limits for a word card; one card over them would make the whole sync fail. */
const MAX_WORD = 64;
const MAX_TRANSLATION = 160;

/** Sentence punctuation around a saved phrase is not part of what is learned. */
const trimPunctuation = (text: string) => text.trim().replace(/^[\s"«“„'(¡¿]+|[\s"»”').,!?;:…]+$/gu, '');

/**
 * The word card a saved translation becomes: the side in a studied language is the word, the other
 * side its meaning. The language being learned wins when both sides qualify. Null when neither side
 * is a studied language, or the text is too long or not in that language's alphabet.
 */
export function vocabularyWordOf(entry: Omit<SavedTranslation, 'id' | 'createdAt'>, studyLanguage: StudyLanguage): WordSuggestion | null {
  const sides = [
    { language: entry.targetLanguage, text: entry.translation, meaning: entry.sourceText },
    { language: entry.sourceLanguage, text: entry.sourceText, meaning: entry.translation },
  ]
    .filter((side): side is typeof side & { language: StudyLanguage } => isStudyLanguage(side.language))
    .sort((a, b) => Number(b.language === studyLanguage) - Number(a.language === studyLanguage));

  for (const side of sides) {
    const word = trimPunctuation(side.text);
    const translation = side.meaning.trim();
    if (!word || word.length > MAX_WORD || !translation || translation.length > MAX_TRANSLATION) continue;
    // Deletions are matched to their language by alphabet, so the word has to be written in it.
    if (studyLanguageOfWord(word) !== side.language) continue;
    return { word, translation, language: side.language };
  }
  return null;
}
