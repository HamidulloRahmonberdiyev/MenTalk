import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Share } from 'react-native';

import { useT } from '@/i18n';
import { useVoiceCapture } from '@/features/conversation/useVoiceCapture';
import { GeminiError } from '@/services/gemini/client';
import { isGeminiConfigured } from '@/services/gemini/config';
import { haptics } from '@/services/haptics';
import { speakText, stopSpeaking } from '@/services/speech';
import { useSettingsStore } from '@/store/settingsStore';
import type { LanguageCode, SavedTranslation, TranslationResult } from '@/types';

import { translate, type SourceLanguage, type TranslateRequest } from './translateService';
import { isFavorite, useTranslatorStore } from './translatorStore';

/** Pause after the last keystroke before a translation is requested. */
const DEBOUNCE_MS = 600;

export type TranslateErrorCode = 'network' | 'quota' | 'failed';

type Request =
  | { status: 'idle' }
  | { status: 'loading'; result?: TranslationResult }
  | { status: 'done'; result: TranslationResult }
  | { status: 'error'; code: TranslateErrorCode; result?: TranslationResult };

const cacheKey = (text: string, source: SourceLanguage, target: LanguageCode, script: string) =>
  `${source}|${target}|${script}|${text.trim().toLowerCase()}`;

function errorCode(error: unknown): TranslateErrorCode {
  if (error instanceof GeminiError) return error.status === 429 ? 'quota' : 'failed';
  return 'network';
}

const isAbort = (error: unknown) => error instanceof Error && error.name === 'AbortError';

/** All translator behaviour: live translation while typing, caching, voice input, speech and saving. */
export function useTranslator() {
  const t = useT();
  const uiLanguage = useSettingsStore((state) => state.language);
  const { source, target, uzScript, favorites } = useTranslatorStore();
  const setUzScript = useTranslatorStore((state) => state.setUzScript);
  const setLanguages = useTranslatorStore((state) => state.setLanguages);
  const addHistory = useTranslatorStore((state) => state.addHistory);
  const toggleFavoriteInStore = useTranslatorStore((state) => state.toggleFavorite);

  const [text, setText] = useState('');
  const [request, setRequest] = useState<Request>({ status: 'idle' });
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const cache = useRef(new Map<string, TranslationResult>());
  const retryTick = useRef(0);
  const [retry, setRetry] = useState(0);

  const trimmed = text.trim();

  // Live translation: wait for a pause in typing, reuse cached answers, cancel stale requests.
  useEffect(() => {
    if (!trimmed || !isGeminiConfigured) return;
    const key = cacheKey(trimmed, source, target, uzScript);
    const cached = cache.current.get(key);
    const controller = new AbortController();

    const timer = setTimeout(
      async () => {
        if (cached) {
          setRequest({ status: 'done', result: cached });
          return;
        }
        setRequest((previous) => ({ status: 'loading', result: 'result' in previous ? previous.result : undefined }));
        try {
          const result = await translate({ text: trimmed, source, target, uzScript, uiLanguage, signal: controller.signal });
          cache.current.set(key, result);
          setRequest({ status: 'done', result });
          if (trimmed.length > 1) {
            addHistory({
              sourceLanguage: result.sourceLanguage,
              targetLanguage: result.targetLanguage,
              sourceText: trimmed,
              translation: result.translation,
            });
          }
        } catch (error) {
          if (isAbort(error) && controller.signal.aborted) return;
          setRequest((previous) => ({
            status: 'error',
            code: errorCode(error),
            result: 'result' in previous ? previous.result : undefined,
          }));
        }
      },
      cached ? 0 : DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, source, target, uzScript, uiLanguage, addHistory, retry]);

  const result = trimmed && request.status !== 'idle' ? request.result : undefined;
  const stale = Boolean(result) && (request.status === 'loading' || result?.sourceText !== trimmed);
  const status: Request['status'] = trimmed ? request.status : 'idle';
  const error = request.status === 'error' ? request.code : null;

  const entry = useMemo(
    () =>
      result
        ? {
            sourceLanguage: result.sourceLanguage,
            targetLanguage: result.targetLanguage,
            sourceText: result.sourceText,
            translation: result.translation,
          }
        : null,
    [result],
  );
  const favorite = entry ? isFavorite(favorites, entry) : false;

  const changeText = useCallback((value: string) => {
    stopSpeaking();
    setText(value);
    if (!value.trim()) setRequest({ status: 'idle' });
  }, []);

  const clear = useCallback(() => changeText(''), [changeText]);

  const swap = useCallback(() => {
    haptics.selection();
    const from: LanguageCode = source === 'auto' ? (result?.sourceLanguage ?? 'en') : source;
    setLanguages(target, from);
    if (result) changeText(result.translation);
  }, [source, target, result, setLanguages, changeText]);

  const speak = useCallback(
    async (value: string, language: LanguageCode) => {
      haptics.light();
      const started = await speakText(value, language, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
      if (!started) setSpeaking(false);
      return started;
    },
    [],
  );

  const copy = useCallback(async (value: string) => {
    await Clipboard.setStringAsync(value);
    haptics.success();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const share = useCallback((value: string) => {
    void Share.share({ message: value }).catch(() => undefined);
  }, []);

  const paste = useCallback(async () => {
    const value = await Clipboard.getStringAsync();
    if (value.trim()) changeText(value);
  }, [changeText]);

  const toggleFavorite = useCallback(() => {
    if (!entry) return;
    haptics.selection();
    toggleFavoriteInStore(entry);
  }, [entry, toggleFavoriteInStore]);

  const reuse = useCallback(
    (item: SavedTranslation) => {
      setLanguages(item.sourceLanguage, item.targetLanguage);
      changeText(item.sourceText);
    },
    [setLanguages, changeText],
  );

  const retryNow = useCallback(() => {
    retryTick.current += 1;
    setRetry(retryTick.current);
  }, []);

  // Voice input: record, auto-stop on silence, then translate what was said.
  const capture = useVoiceCapture({
    onSpeechEnd: async (audio) => {
      setListening(false);
      setRequest((previous) => ({ status: 'loading', result: 'result' in previous ? previous.result : undefined }));
      try {
        const spoken: TranslateRequest = { text: '', audioUri: audio.uri, source, target, uzScript, uiLanguage };
        const translated = await translate(spoken);
        if (!translated.sourceText) throw new GeminiError('No speech recognised');
        cache.current.set(cacheKey(translated.sourceText, source, target, uzScript), translated);
        setText(translated.sourceText);
        setRequest({ status: 'done', result: translated });
        addHistory({
          sourceLanguage: translated.sourceLanguage,
          targetLanguage: translated.targetLanguage,
          sourceText: translated.sourceText,
          translation: translated.translation,
        });
      } catch (caught) {
        setRequest({ status: 'error', code: errorCode(caught) });
      }
    },
    onNoSpeech: () => setListening(false),
  });
  const { start: startCapture, stop: stopCapture } = capture;

  const toggleMic = useCallback(async () => {
    haptics.medium();
    if (listening) {
      await stopCapture();
      return;
    }
    stopSpeaking();
    const opened = await startCapture();
    setListening(opened);
    if (!opened) {
      Alert.alert(t('voice.permissionTitle'), t('voice.permissionMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('voice.openSettings'), onPress: () => void Linking.openSettings() },
      ]);
    }
  }, [listening, startCapture, stopCapture, t]);

  useEffect(() => () => stopSpeaking(), []);

  return {
    configured: isGeminiConfigured,
    text,
    source,
    target,
    uzScript,
    status,
    error,
    result,
    stale,
    favorite,
    listening,
    speaking,
    copied,
    micLevel: capture.level,
    changeText,
    clear,
    swap,
    speak,
    copy,
    share,
    paste,
    toggleFavorite,
    toggleMic,
    reuse,
    retry: retryNow,
    setLanguages,
    setUzScript,
  };
}
