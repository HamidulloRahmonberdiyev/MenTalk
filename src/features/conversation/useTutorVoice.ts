import { createAudioPlayer, getRecordingPermissionsAsync, setAudioModeAsync, type AudioPlayer, type AudioSample } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { LipSync } from '@/features/face';
import { getDeviceVoiceId } from '@/services/speech/deviceVoice';
import { stripEmoji } from '@/services/text';
import type { AiMessage, VoiceState } from '@/types';

const LANGUAGE = 'ru-RU';
const RATE = 0.95;
/** A clip that hasn't started by then (bad URL, slow network) is replaced by the device voice. */
const AUDIO_START_TIMEOUT_MS = 6_000;
const PLAYABLE_URI = /^(https?|file):\/\//i;

/** Loudness 0..1 of a block of PCM frames, on a perceptual (dB) scale. */
function loudness(sample: AudioSample): number {
  const frames = sample.channels[0]?.frames;
  if (!frames?.length) return 0;
  let sum = 0;
  for (const value of frames) sum += value * value;
  const db = 20 * Math.log10(Math.sqrt(sum / frames.length) + 1e-6);
  return Math.min(1, Math.max(0, (db + 48) / 40));
}

/**
 * Sampling the playback is how the lips follow the real voice. Android only allows it with the
 * microphone permission, which the app asks for anyway; without it the lips follow the text timing.
 */
async function enableSampling(player: AudioPlayer): Promise<void> {
  if (!player.isAudioSamplingSupported) return;
  if (Platform.OS === 'android') {
    const permission = await getRecordingPermissionsAsync().catch(() => null);
    if (!permission?.granted) return;
  }
  try {
    player.setAudioSamplingEnabled(true);
  } catch {
    // The text timeline alone still drives the face.
  }
}

/**
 * Plays the tutor's lines aloud: the synthesized audio that came with the message, or, when there
 * is none (mock backend, TTS failure), the device's Russian text-to-speech. `lipSync` is fed the
 * spoken text, word boundaries, playback position and loudness so the face moves with the voice.
 */
export function useTutorVoice(message: AiMessage | null, voiceState: VoiceState, lipSync: LipSync) {
  const [speaking, setSpeaking] = useState(false);
  const spokenId = useRef<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearStartTimer = useCallback(() => {
    if (startTimer.current) clearTimeout(startTimer.current);
    startTimer.current = null;
  }, []);

  const stop = useCallback(() => {
    clearStartTimer();
    Speech.stop();
    lipSync.stop();
    if (player.current) {
      player.current.pause();
      player.current.remove();
      player.current = null;
      setSpeaking(false);
    }
  }, [lipSync, clearStartTimer]);

  const speakWithDevice = useCallback(
    async (text: string) => {
      const spoken = stripEmoji(text);
      const voice = await getDeviceVoiceId(LANGUAGE);
      lipSync.load(spoken, RATE);
      const finish = () => {
        lipSync.stop();
        setSpeaking(false);
      };
      Speech.speak(spoken, {
        language: LANGUAGE,
        voice,
        rate: RATE,
        onStart: () => {
          lipSync.start();
          setSpeaking(true);
        },
        // Native: { charIndex, charLength }; web: a SpeechSynthesisEvent with the same fields.
        onBoundary: (event: { charIndex?: number; charLength?: number }) => {
          if (typeof event?.charIndex === 'number') lipSync.boundary(event.charIndex, event.charLength);
        },
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    },
    [lipSync],
  );

  const play = useCallback(
    (line: AiMessage) => {
      stop();
      if (!line.audioUri || !PLAYABLE_URI.test(line.audioUri)) {
        if (__DEV__ && line.audioUri) console.warn('Unplayable tutor audio URL:', line.audioUri);
        void speakWithDevice(line.text);
        return;
      }
      try {
        const next = createAudioPlayer({ uri: line.audioUri });
        player.current = next;
        lipSync.load(stripEmoji(line.text));
        let started = false;
        // The clip failed to load or play: say the line with the device voice instead of staying silent.
        const fallBack = (reason: string) => {
          if (started || player.current !== next) return;
          if (__DEV__) console.warn(`Tutor audio failed (${reason}):`, line.audioUri);
          stop();
          void speakWithDevice(line.text);
        };
        startTimer.current = setTimeout(() => fallBack('timeout'), AUDIO_START_TIMEOUT_MS);
        next.addListener('playbackStatusUpdate', (status) => {
          if (status.error) return fallBack(status.error);
          if (status.playing && !started) {
            started = true;
            clearStartTimer();
            lipSync.start();
            setSpeaking(true);
          }
          if (status.duration > 0) lipSync.sync(status.currentTime, status.duration);
          if (status.didJustFinish) {
            lipSync.stop();
            setSpeaking(false);
            next.remove();
            if (player.current === next) player.current = null;
          }
        });
        next.addListener('audioSampleUpdate', (sample) => {
          lipSync.level(loudness(sample));
          if (next.duration > 0) lipSync.sync(sample.timestamp, next.duration);
        });
        void enableSampling(next);
        next.play();
      } catch {
        void speakWithDevice(line.text);
      }
    },
    [stop, speakWithDevice, lipSync, clearStartTimer],
  );

  useEffect(() => {
    // iOS mutes playback in silent mode unless the app's audio session allows it.
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
    return stop;
  }, [stop]);

  useEffect(() => {
    if (!message || message.id === spokenId.current) return;
    spokenId.current = message.id;
    play(message);
  }, [message, play]);

  // The user takes the floor (or the tutor is preparing an answer): stop talking.
  useEffect(() => {
    if (voiceState === 'listening' || voiceState === 'thinking') stop();
  }, [voiceState, stop]);

  const replay = useCallback(() => {
    if (message) play(message);
  }, [message, play]);

  return { speaking, replay };
}
