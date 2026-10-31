import type { TranslationKey } from '@/i18n';
import type { StudyLanguage } from '@/services/learning/types';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { ImageSourcePropType } from 'react-native';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type ScenarioId = 'intro' | 'cafe' | 'shop' | 'taxi' | 'work' | 'airport';

export interface Scenario {
  id: ScenarioId;
  icon: IconName;
  tint: string;
  image: ImageSourcePropType;
  gradient: readonly [string, string];
}

/** Turn-taking state of the voice conversation. */
export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type TutorEmotion = 'neutral' | 'happy' | 'encouraging' | 'curious' | 'empathetic' | 'surprised' | 'playful';

export interface AiMessage {
  id: string;
  text: string;
  /** Emotion the backend attached to the line, if any. */
  emotion?: TutorEmotion;
  /** Synthesized speech for the line. When absent, the UI reads `text` with the device voice. */
  audioUri?: string;
}

export type MetricId = 'speech' | 'vocabulary' | 'grammar';

export interface Metric {
  id: MetricId;
  score: number;
  max: number;
}

export interface Mistake {
  id: string;
  wrong: string;
  /** Fragment of `wrong` to highlight. */
  wrongMark: string;
  correct: string;
  /** Fragment of `correct` to highlight. */
  correctMark: string;
  /** Explanation written by the backend, in the learner's language. */
  note?: string;
  /** Built-in explanation, used by mock data. */
  noteKey?: TranslationKey;
}

export interface ConversationResult {
  scenarioId: ScenarioId;
  overall: number;
  durationSec: number;
  metrics: Metric[];
  mistakes: Mistake[];
  /** Words from the chat the learner probably did not know, offered for saving. */
  newWords?: WordSuggestion[];
}

export interface HistoryEntry {
  id: string;
  scenarioId: ScenarioId;
  durationSec: number;
  score: number;
  date: number;
}

export type Gender = 'male' | 'female' | 'unspecified';
export type LearnerLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';
export type LearningGoal = 'travel' | 'work' | 'study' | 'relocation' | 'family' | 'fun';
/** How the learner studied the language before. */
export type LearnerExperience = 'none' | 'school' | 'self_taught' | 'courses' | 'immersion';
/** A skill the learner finds hard and wants the tutor to work on. */
export type LearningFocus = 'speaking' | 'listening' | 'vocabulary' | 'grammar' | 'pronunciation' | 'confidence';
/** 'placement': measured by the onboarding test; 'self': picked by hand. */
export type LevelSource = 'placement' | 'self';

/** Everything the tutor should know about the person it is talking to. */
/** Where the learner is from: an ISO 3166-1 alpha-2 code (legacy profiles may hold 'OTHER'). */
export type CountryCode = string;

export interface LearnerProfile {
  name: string;
  gender: Gender | null;
  country: CountryCode | null;
  age: number | null;
  level: LearnerLevel | null;
  goals: LearningGoal[];
  /** Language of the app UI; explanations and hints are written in it. */
  uiLanguage: 'uz' | 'ru' | 'en';
  /** The language the learner practises with the tutor. */
  studyLanguage: StudyLanguage;
}

export interface UserProfile {
  name: string;
  email: string | null;
  /** The uploaded photo, else the Google one; null shows the initial instead. */
  avatarUrl: string | null;
  /** True when the photo was uploaded by the learner, so it can be removed. */
  avatarCustom: boolean;
  onboarded: boolean;
  gender: Gender | null;
  country: CountryCode | null;
  /** ISO date (YYYY-MM-DD). */
  birthDate: string | null;
  level: LearnerLevel | null;
  levelSource: LevelSource | null;
  /** Share of placement questions answered right, 0–100; null when the level was picked by hand. */
  placementScore: number | null;
  experience: LearnerExperience | null;
  goals: LearningGoal[];
  focus: LearningFocus[];
  dailyGoalMinutes: number;
  minutesToday: number;
  lastScenarioId: ScenarioId | null;
  history: HistoryEntry[];
}

export type LanguageCode = 'uz' | 'ru' | 'en' | 'tr' | 'kk' | 'ar' | 'de' | 'ko';
export type UzbekScript = 'latin' | 'cyrillic';
export type Register = 'neutral' | 'formal' | 'informal' | 'slang';

export interface TranslationMeaning {
  translation: string;
  partOfSpeech: string;
  example?: { source: string; target: string };
}

export interface TranslationAlternative {
  text: string;
  register: Register;
}

export interface TranslationResult {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  /** The text that was translated (the transcript when the input was spoken). */
  sourceText: string;
  translation: string;
  /** Latin-letter reading of the translation when its script is not Latin. */
  reading: string;
  /** Russian translation with stress marks, to help pronunciation. */
  stressed: string;
  /** Spelling-corrected version of the input, when it had obvious typos. */
  correctedInput: string;
  meanings: TranslationMeaning[];
  alternatives: TranslationAlternative[];
  /** Short usage note in the app language. */
  note: string;
}

export interface SavedTranslation {
  id: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  sourceText: string;
  translation: string;
  createdAt: number;
}

/** A word as it arrives from a lookup or from the end-of-chat analysis, before it is saved. */
export interface WordSuggestion {
  /** Dictionary form, lowercase: what is learned. */
  word: string;
  /** Meaning in the learner's language (or a simple explanation when the UI is in the studied language). */
  translation: string;
  /** The language the word belongs to; missing on words saved before English existed (Russian). */
  language?: StudyLanguage;
  /** The sentence in the studied language the word came from. */
  example?: string;
  /** The inflected form as it appears in `example`, when it differs from `word`. */
  form?: string;
}

/** A saved word plus its spaced-repetition state. */
export interface VocabCard extends WordSuggestion {
  id: string;
  addedAt: number;
  /** 0 (new) to 6 (mastered): how far along the review ladder the word is. */
  stage: number;
  /** When the word is next worth reviewing. */
  due: number;
  /** Correct answers in a row. */
  streak: number;
  lapses: number;
  /** Last local change (ms). Decides which side wins when the card is synced. */
  updatedAt?: number;
}
