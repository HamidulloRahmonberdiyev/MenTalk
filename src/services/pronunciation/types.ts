import type { Language } from '@/i18n';
import type { StudyLanguage } from '@/services/learning';
import type { WordSuggestion } from '@/types';

/** Green, yellow or red in the UI. */
export type WordVerdict = 'good' | 'fair' | 'bad';

export interface WordScore {
  /** The word as written in the phrase. */
  word: string;
  /** 0..100 accuracy. */
  score: number;
  verdict: WordVerdict;
  /** The word was left out entirely. */
  omitted?: boolean;
}

/** One of the (at most two) mistakes worth explaining, written in the UI language. */
export interface PronunciationTip {
  word: string;
  /** The sound that went wrong, in IPA ("θ"), when known. */
  sound?: string;
  /** What went wrong. */
  problem: string;
  /** How to say it right. */
  howTo: string;
}

export interface PronunciationResult {
  /** 0..100 overall. */
  score: number;
  /** One entry per word of the reference phrase, in order. */
  words: WordScore[];
  tips: PronunciationTip[];
  /**
   * Every word that was not said well, as a vocabulary entry (dictionary form + meaning in the UI
   * language), so it can go straight into the word list. Comes in the same answer: no extra request.
   */
  newWords: WordSuggestion[];
}

export interface AssessRequest {
  /** Recording on disk; the service deletes it once the assessment is over, whatever the outcome. */
  audioUri: string;
  /** The phrase the learner was asked to read. */
  reference: string;
  language: StudyLanguage;
  /** Language of the explanations. */
  uiLanguage: Language;
  signal?: AbortSignal;
}

export interface PronunciationService {
  assess(request: AssessRequest): Promise<PronunciationResult>;
}

export const GOOD_FROM = 80;
export const FAIR_FROM = 55;

export const verdictOf = (score: number): WordVerdict => (score >= GOOD_FROM ? 'good' : score >= FAIR_FROM ? 'fair' : 'bad');

/** Splits a phrase into the words that get scored, keeping apostrophes and hyphens inside words. */
export function wordsOf(phrase: string): string[] {
  return phrase.match(/[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu) ?? [];
}

/** Lines the server's (or the model's) word list up with the reference, so every reference word gets a colour. */
export function alignWords(reference: string, scored: readonly { word: string; score: number; omitted?: boolean }[]): WordScore[] {
  const norm = (word: string) => word.toLocaleLowerCase().replace(/[’]/g, "'");
  let cursor = 0;
  return wordsOf(reference).map((word) => {
    const index = scored.findIndex((entry, i) => i >= cursor && norm(entry.word) === norm(word));
    const match = index >= 0 ? scored[index] : undefined;
    if (index >= 0) cursor = index + 1;
    const score = Math.round(Math.min(100, Math.max(0, match?.score ?? 0)));
    const omitted = !match || match.omitted === true;
    return { word, score: omitted ? 0 : score, verdict: omitted ? 'bad' : verdictOf(score), omitted: omitted || undefined };
  });
}
