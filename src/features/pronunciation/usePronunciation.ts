import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { useVoiceCapture } from '@/features/conversation/useVoiceCapture';
import type { RecordedAudio } from '@/services/conversation';
import { haptics } from '@/services/haptics';
import { pronunciationService, type PronunciationResult } from '@/services/pronunciation';
import { stopSpeaking } from '@/services/speech';
import { useSettingsStore } from '@/store/settingsStore';
import type { WordSuggestion } from '@/types';

import { useRemindersStore } from '../reminders/remindersStore';
import { isUntouched } from '../vocabulary/srs';
import { findCard, useVocabularyStore } from '../vocabulary/vocabularyStore';
import { phrasesFor, type PhraseLevel } from './phrases';

export type PracticePhase = 'ready' | 'recording' | 'analyzing' | 'result' | 'error';
export type PracticeError = 'denied' | 'noSpeech' | 'failed';

export interface Pronunciation {
  phase: PracticePhase;
  error: PracticeError | null;
  phrase: string;
  level: PhraseLevel;
  result: PronunciationResult | null;
  /** Words from this attempt that were new to the word list and have just been added to it. */
  saved: WordSuggestion[];
  /** Takes one of `saved` back out of the word list. */
  unsave: (word: string) => void;
  /** 0..1 live mic loudness while recording. */
  micLevel: SharedValue<number>;
  /** Starts recording, or stops and sends if already recording. */
  toggleRecording: () => void;
  /** Same phrase again, previous result cleared. */
  retry: () => void;
  next: () => void;
  setLevel: (level: PhraseLevel) => void;
}

/**
 * Read-aloud practice: record a phrase (the mic closes by itself when the learner stops talking),
 * send it once, show the scored words. Only the latest attempt may update the screen.
 */
export function usePronunciation(): Pronunciation {
  const studyLanguage = useSettingsStore((state) => state.studyLanguage);
  const uiLanguage = useSettingsStore((state) => state.language);
  const [level, setLevelState] = useState<PhraseLevel>('easy');
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<PracticePhase>('ready');
  const [error, setError] = useState<PracticeError | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [saved, setSaved] = useState<WordSuggestion[]>([]);
  const attempt = useRef<AbortController | null>(null);

  const phrases = useMemo(() => phrasesFor(studyLanguage, level), [studyLanguage, level]);
  const phrase = phrases[index % phrases.length];

  const cancelAttempt = () => {
    attempt.current?.abort();
    attempt.current = null;
  };

  const onSpeechEnd = useCallback(
    (audio: RecordedAudio) => {
      cancelAttempt();
      const controller = new AbortController();
      attempt.current = controller;
      setPhase('analyzing');
      pronunciationService
        .assess({ audioUri: audio.uri, reference: phrase, language: studyLanguage, uiLanguage, signal: controller.signal })
        .then((assessed) => {
          if (controller.signal.aborted) return;
          // Badly said words go straight into the word list; the store syncs it to the server.
          const vocabulary = useVocabularyStore.getState();
          const fresh = assessed.newWords.filter((word, i, all) => !findCard(vocabulary.cards, word.word) && all.findIndex((other) => other.word === word.word) === i);
          if (fresh.length) vocabulary.addWords(fresh, 'lesson');
          setSaved(fresh);
          setResult(assessed);
          setPhase('result');
          useRemindersStore.getState().markActive();
          if (assessed.score >= 80) haptics.success();
          else haptics.light();
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setError('failed');
          setPhase('error');
        });
    },
    [phrase, studyLanguage, uiLanguage],
  );

  const onNoSpeech = useCallback(() => {
    setError('noSpeech');
    setPhase('error');
  }, []);

  const capture = useVoiceCapture({ onSpeechEnd, onNoSpeech });

  const toggleRecording = useCallback(() => {
    if (phase === 'analyzing') return;
    if (phase === 'recording') {
      void capture.stop();
      return;
    }
    stopSpeaking();
    setError(null);
    setResult(null);
    setSaved([]);
    setPhase('recording');
    haptics.medium();
    void capture.start().then((started) => {
      if (started === 'started') return;
      setError(started === 'denied' ? 'denied' : 'failed');
      setPhase('error');
    });
  }, [phase, capture]);

  const reset = useCallback(() => {
    cancelAttempt();
    void capture.abort();
    stopSpeaking();
    setResult(null);
    setSaved([]);
    setError(null);
    setPhase('ready');
  }, [capture]);

  const next = useCallback(() => {
    reset();
    setIndex((current) => current + 1);
  }, [reset]);

  const setLevel = useCallback(
    (value: PhraseLevel) => {
      reset();
      setLevelState(value);
      setIndex(0);
    },
    [reset],
  );

  const unsave = useCallback((word: string) => {
    const vocabulary = useVocabularyStore.getState();
    const card = findCard(vocabulary.cards, word);
    // Only a card nobody has practised yet; one with progress stays.
    if (card && isUntouched(card)) vocabulary.removeWord(card.id);
    setSaved((current) => current.filter((item) => item.word !== word));
    haptics.selection();
  }, []);

  // Leaving the screen drops an answer that has not arrived yet.
  useEffect(() => () => cancelAttempt(), []);

  return { phase, error, phrase, level, result, saved, unsave, micLevel: capture.level, toggleRecording, retry: reset, next, setLevel };
}
