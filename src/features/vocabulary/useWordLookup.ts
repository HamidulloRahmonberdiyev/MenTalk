import { useCallback, useEffect, useState } from 'react';

import { useSettingsStore } from '@/store/settingsStore';
import type { WordSuggestion } from '@/types';

import { lookupWord } from './lookupService';
import { findCard, useVocabularyStore } from './vocabularyStore';

export interface WordRequest {
  word: string;
  sentence: string;
}

export type LookupState = { status: 'loading' } | { status: 'ready'; word: WordSuggestion } | { status: 'error' };

/** Resolves a tapped word: from the saved list when it is there, otherwise by asking Gemini. */
export function useWordLookup(request: WordRequest | null): LookupState & { retry: () => void } {
  const uiLanguage = useSettingsStore((state) => state.language);
  const saved = useVocabularyStore((state) => (request ? findCard(state.cards, request.word) : undefined));
  // The outcome is stored with the request it answers, so "loading" is simply "no outcome for this request yet".
  const [fetched, setFetched] = useState<{ key: string; outcome: Exclude<LookupState, { status: 'loading' }> } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const word = request?.word;
  const sentence = request?.sentence;
  const hasSaved = saved !== undefined;
  const key = `${word}|${sentence}|${uiLanguage}|${attempt}`;

  useEffect(() => {
    if (!word || !sentence || hasSaved) return;
    const controller = new AbortController();
    lookupWord({ word, sentence, uiLanguage, signal: controller.signal })
      .then((result) => setFetched({ key, outcome: { status: 'ready', word: result } }))
      .catch(() => {
        if (!controller.signal.aborted) setFetched({ key, outcome: { status: 'error' } });
      });
    return () => controller.abort();
  }, [word, sentence, hasSaved, uiLanguage, key]);

  const current: LookupState = saved
    ? { status: 'ready', word: saved }
    : fetched?.key === key
      ? fetched.outcome
      : { status: 'loading' };

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...current, retry };
}
