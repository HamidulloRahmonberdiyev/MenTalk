import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { RecordedAudio } from '@/services/conversation';
import { haptics } from '@/services/haptics';

import { DEFAULT_ENDPOINT_CONFIG, SpeechEndpointDetector } from './speechEndpoint';

/** Speech-grade audio: mono, 16 kHz, 48 kbps AAC is ~5x smaller than the high-quality preset, so it uploads fast. */
const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 48_000,
  isMeteringEnabled: true,
};

/** Without loudness readings the turn cannot end by itself; cap it so the mic never stays open forever. */
const MANUAL_ONLY_MAX_MS = 12_000;

export type CaptureStart = 'started' | 'denied' | 'failed';

interface VoiceCaptureOptions {
  /** Speech was heard and then stopped (or the user tapped stop): here is the recording. */
  onSpeechEnd: (audio: RecordedAudio) => void;
  /** The mic closed without any speech. */
  onNoSpeech: () => void;
}

export interface VoiceCapture {
  /** Opens the mic. */
  start: () => Promise<CaptureStart>;
  /** Ends the turn now and submits it if anything was said. */
  stop: () => Promise<void>;
  /** Closes the mic silently, with no callbacks. */
  abort: () => Promise<void>;
  /** 0..1 live input loudness for visuals. */
  level: SharedValue<number>;
}

interface Turn {
  startedAt: number;
  detector: SpeechEndpointDetector;
  manualOnly: boolean;
}

/**
 * Records one spoken turn and ends it the moment the person stops talking, sending the audio on
 * straight away. End-of-speech logic lives in `SpeechEndpointDetector`; this hook owns the recorder.
 */
export function useVoiceCapture({ onSpeechEnd, onNoSpeech }: VoiceCaptureOptions): VoiceCapture {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const level = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const turn = useRef<Turn | null>(null);
  const starting = useRef(false);
  const permitted = useRef(false);
  const handlers = useRef({ onSpeechEnd, onNoSpeech });

  useEffect(() => {
    handlers.current = { onSpeechEnd, onNoSpeech };
  }, [onSpeechEnd, onNoSpeech]);

  /** Stops the recorder and returns the file. Restoring the playback audio mode is not awaited: it must not delay sending. */
  const close = useCallback(async (): Promise<string | null> => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    turn.current = null;
    level.set(0);
    try {
      await recorder.stop();
    } catch {
      // Already stopped.
    }
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    return recorder.uri;
  }, [recorder, level]);

  const finish = useCallback(
    async (spoken: boolean, durationMs: number) => {
      const uri = await close();
      if (spoken && uri) handlers.current.onSpeechEnd({ uri, durationMs });
      else handlers.current.onNoSpeech();
    },
    [close],
  );

  const tick = useCallback(() => {
    const current = turn.current;
    if (!current) return;

    const now = Date.now();
    const elapsed = now - current.startedAt;
    const decision = current.detector.push(recorder.getStatus().metering, now);
    level.set(current.detector.level);

    if (decision === 'unsupported') current.manualOnly = true;
    if (current.manualOnly) {
      if (elapsed >= MANUAL_ONLY_MAX_MS) void finish(true, elapsed);
      return;
    }

    if (decision === 'end') {
      haptics.light();
      void finish(true, elapsed);
    } else if (decision === 'noSpeech') {
      void finish(false, elapsed);
    }
  }, [recorder, level, finish]);

  const start = useCallback(async (): Promise<CaptureStart> => {
    if (turn.current || starting.current) return 'started';
    starting.current = true;
    try {
      if (!permitted.current) {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) return 'denied';
        permitted.current = true;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      turn.current = { startedAt: Date.now(), detector: new SpeechEndpointDetector(), manualOnly: false };
      timer.current = setInterval(tick, DEFAULT_ENDPOINT_CONFIG.tickMs);
      return 'started';
    } catch {
      return 'failed';
    } finally {
      starting.current = false;
    }
  }, [recorder, tick]);

  const stop = useCallback(async () => {
    const current = turn.current;
    if (!current) return;
    const elapsed = Date.now() - current.startedAt;
    // A manual stop sends whatever was recorded, as long as some speech was heard (or metering is unavailable).
    await finish(current.detector.hasSpoken || current.manualOnly, elapsed);
  }, [finish]);

  const abort = useCallback(async () => {
    if (turn.current) await close();
  }, [close]);

  // Leaving the app mid-sentence must not leave the microphone open.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && turn.current) void finish(false, 0);
    });
    return () => subscription.remove();
  }, [finish]);

  useEffect(
    () => () => {
      void abort();
    },
    [abort],
  );

  return { start, stop, abort, level };
}
