import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { stripEmoji } from '@/services/text';
import type { AiMessage, VoiceState } from '@/types';

const LANGUAGE = 'ru-RU';
const RATE = 0.95;

/**
 * Plays the tutor's lines aloud: the synthesized audio that came with the message, or, when there
 * is none (mock backend, TTS failure), the device's Russian text-to-speech.
 */
export function useTutorVoice(message: AiMessage | null, voiceState: VoiceState) {
  const [speaking, setSpeaking] = useState(false);
  const spokenId = useRef<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);

  const stop = useCallback(() => {
    Speech.stop();
    if (player.current) {
      player.current.pause();
      player.current.remove();
      player.current = null;
      setSpeaking(false);
    }
  }, []);

  const speakWithDevice = useCallback((text: string) => {
    Speech.speak(stripEmoji(text), {
      language: LANGUAGE,
      rate: RATE,
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, []);

  const play = useCallback(
    (line: AiMessage) => {
      stop();
      if (!line.audioUri) {
        speakWithDevice(line.text);
        return;
      }
      try {
        const next = createAudioPlayer({ uri: line.audioUri });
        player.current = next;
        next.addListener('playbackStatusUpdate', (status) => {
          if (status.playing) setSpeaking(true);
          if (status.didJustFinish) {
            setSpeaking(false);
            next.remove();
            if (player.current === next) player.current = null;
          }
        });
        next.play();
      } catch {
        speakWithDevice(line.text);
      }
    },
    [stop, speakWithDevice],
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
