import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { RecordedAudio } from '@/services/conversation';

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

const TICK_MS = 100;
/** Speech must be heard this long before the turn counts as started. */
const MIN_SPEECH_MS = 300;
/** Silence after speech that ends the turn. */
const END_SILENCE_MS = 1400;
/** Give up if nothing is said for this long after the mic opens. */
const NO_SPEECH_MS = 7000;
const MAX_TURN_MS = 30_000;
/** dBFS: never treat anything quieter than this as speech, however quiet the room. */
const MIN_THRESHOLD_DB = -45;
/** Speech has to rise this far above the room's noise floor. */
const MARGIN_DB = 12;
const MAX_FLOOR_DB = -35;

interface TurnState {
  startedAt: number;
  floor: number;
  spokeMs: number;
  silentMs: number;
  hasSpoken: boolean;
}

interface VoiceCaptureOptions {
  /** Speech was heard and then stopped (or the user tapped stop): here is the recording. */
  onSpeechEnd: (audio: RecordedAudio) => void;
  /** The mic closed without any speech. */
  onNoSpeech: () => void;
}

export interface VoiceCapture {
  /** Opens the mic. Resolves false when the microphone permission is denied. */
  start: () => Promise<boolean>;
  /** Ends the turn now and submits it if anything was said. */
  stop: () => Promise<void>;
  /** Closes the mic silently, with no callbacks. */
  abort: () => Promise<void>;
  /** 0..1 live input loudness for visuals. */
  level: SharedValue<number>;
}

/**
 * Records one spoken turn and closes the mic by itself once the user stops talking:
 * it learns the room's noise floor, waits for speech, then ends after a pause.
 */
export function useVoiceCapture({ onSpeechEnd, onNoSpeech }: VoiceCaptureOptions): VoiceCapture {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const level = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const turn = useRef<TurnState | null>(null);
  const handlers = useRef({ onSpeechEnd, onNoSpeech });

  useEffect(() => {
    handlers.current = { onSpeechEnd, onNoSpeech };
  }, [onSpeechEnd, onNoSpeech]);

  const close = useCallback(async () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    turn.current = null;
    level.set(0);
    try {
      await recorder.stop();
    } catch {
      // Already stopped.
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
  }, [recorder, level]);

  const finish = useCallback(
    async (spoken: boolean, durationMs: number) => {
      await close();
      if (spoken && recorder.uri) handlers.current.onSpeechEnd({ uri: recorder.uri, durationMs });
      else handlers.current.onNoSpeech();
    },
    [close, recorder],
  );

  const tick = useCallback(() => {
    const state = turn.current;
    if (!state) return;

    const db = recorder.getStatus().metering ?? -160;
    level.set(Math.min(Math.max((db + 60) / 60, 0), 1));

    // The floor drops to any quieter reading at once and creeps up slowly, so steady noise is ignored.
    state.floor = db < state.floor ? db : Math.min(state.floor + (db - state.floor) * 0.02, MAX_FLOOR_DB);
    const speaking = db > Math.max(MIN_THRESHOLD_DB, state.floor + MARGIN_DB);

    if (speaking) {
      state.spokeMs += TICK_MS;
      state.silentMs = 0;
      if (state.spokeMs >= MIN_SPEECH_MS) state.hasSpoken = true;
    } else {
      state.silentMs += TICK_MS;
    }

    const elapsed = Date.now() - state.startedAt;
    const ended = state.hasSpoken && state.silentMs >= END_SILENCE_MS;
    const idleTooLong = !state.hasSpoken && elapsed >= NO_SPEECH_MS;
    if (ended || idleTooLong || elapsed >= MAX_TURN_MS) {
      void finish(state.hasSpoken, elapsed);
    }
  }, [recorder, level, finish]);

  const start = useCallback(async () => {
    if (turn.current) return true;
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return false;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    turn.current = { startedAt: Date.now(), floor: -60, spokeMs: 0, silentMs: 0, hasSpoken: false };
    timer.current = setInterval(tick, TICK_MS);
    return true;
  }, [recorder, tick]);

  const stop = useCallback(async () => {
    const state = turn.current;
    if (!state) return;
    await finish(state.hasSpoken, Date.now() - state.startedAt);
  }, [finish]);

  const abort = useCallback(async () => {
    if (turn.current) await close();
  }, [close]);

  useEffect(
    () => () => {
      void abort();
    },
    [abort],
  );

  return { start, stop, abort, level };
}
