import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { writeSpeechFile, type SpeechFile } from '@/services/gemini/audioFiles';
import { synthesizeSpeech } from '@/services/gemini/client';
import { geminiConfig, isGeminiConfigured } from '@/services/gemini/config';
import type { LanguageCode } from '@/types';

const TAGS: Record<LanguageCode, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
  tr: 'tr-TR',
  kk: 'kk-KZ',
  ar: 'ar-SA',
  de: 'de-DE',
  ko: 'ko-KR',
};

export interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
}

let deviceLanguages: Promise<Set<string>> | null = null;

/** Languages the device has a text-to-speech voice for, e.g. {'ru', 'en'}. Loaded once. */
function loadDeviceLanguages(): Promise<Set<string>> {
  deviceLanguages ??= Speech.getAvailableVoicesAsync()
    .then((voices) => new Set(voices.map((voice) => voice.language.slice(0, 2).toLowerCase())))
    .catch(() => new Set<string>());
  return deviceLanguages;
}

let player: AudioPlayer | null = null;
let playerFile: SpeechFile | null = null;

function releasePlayer(): void {
  player?.pause();
  player?.remove();
  playerFile?.delete();
  player = null;
  playerFile = null;
}

export function stopSpeaking(): void {
  Speech.stop();
  releasePlayer();
}

/**
 * Reads text aloud. Uses the device voice when it has one for the language; otherwise (typically
 * Uzbek) falls back to Gemini speech. Resolves to false when neither is available.
 */
export async function speakText(text: string, language: LanguageCode, handlers: SpeakHandlers = {}): Promise<boolean> {
  stopSpeaking();
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);

  if ((await loadDeviceLanguages()).has(language)) {
    Speech.speak(text, {
      language: TAGS[language],
      onStart: handlers.onStart,
      onDone: handlers.onEnd,
      onStopped: handlers.onEnd,
      onError: handlers.onEnd,
    });
    return true;
  }

  if (!isGeminiConfigured || !geminiConfig.ttsEnabled) return false;
  try {
    const file = writeSpeechFile(`speak-${Date.now()}`, await synthesizeSpeech(text, language));
    releasePlayer();
    playerFile = file;
    const next = createAudioPlayer({ uri: file.uri });
    player = next;
    next.addListener('playbackStatusUpdate', (status) => {
      if (status.playing) handlers.onStart?.();
      if (status.didJustFinish) {
        handlers.onEnd?.();
        if (player === next) releasePlayer();
      }
    });
    next.play();
    return true;
  } catch {
    return false;
  }
}
