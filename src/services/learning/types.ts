import type { ScenarioId } from '@/types';

/** A language the app can teach. Adding one means adding a pack (see `./index.ts`), nothing else changes. */
export type StudyLanguage = 'ru' | 'en';

/**
 * Everything that differs between taught languages. Prompts, speech, word games and the tutor read
 * the language through this contract and never branch on a concrete language themselves.
 */
export interface StudyLanguagePack {
  readonly id: StudyLanguage;
  /** English name of the language, used inside AI prompts ("Russian"). */
  readonly name: string;
  /** The tutor persona who speaks this language. */
  readonly tutorName: string;
  /** BCP-47 tag for the device voice ("ru-RU"). */
  readonly speechTag: string;
  /** Extra words for the prompt when the script matters ("(Cyrillic)"), else empty. */
  readonly scriptNote: string;
  /** One word of the language in running text. Must have the global flag. */
  readonly wordPattern: RegExp;
  /** Where each scenario happens and who the tutor is in it. */
  readonly scenarioBriefs: Readonly<Record<ScenarioId, string>>;
  /** Natural follow-up questions the tutor can end a reply with, quoted for the prompt. */
  readonly followUpExamples: string;
  /** Rules that only make sense for this language (politeness forms, spelling variety). */
  readonly tutorRules: readonly string[];
  /** Words too basic to suggest for learning, quoted for the prompt. */
  readonly basicWords: string;
  /** What a dictionary form means for this language, for the word lookup. */
  readonly dictionaryForm: string;
}
