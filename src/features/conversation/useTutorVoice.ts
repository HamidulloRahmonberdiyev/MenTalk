import { createAudioPlayer, getRecordingPermissionsAsync, setAudioModeAsync, type AudioPlayer, type AudioSample } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { LipSync } from '@/features/face';
import { getDeviceVoiceId } from '@/services/speech/deviceVoice';
import { voiceStyleFor } from '@/services/speech/voiceStyle';
import { stripEmoji } from '@/services/text';
import { useSettingsStore, useStudyLanguage } from '@/store/settingsStore';
import type { AiMessage, VoiceState } from '@/types';

/** A clip that hasn't started by then (bad URL, slow network) is replaced by the device voice. */
const AUDIO_START_TIMEOUT_MS = 6_000;
const PLAYABLE_URI = /^(https?|file):\/\//i;
/**
 * The text of a line can arrive before its recording. Waiting this long for the recording keeps the
 * tutor's real voice in most turns; past it, the device voice reads the line so the learner never waits.
 */
const AUDIO_GRACE_MS = 2_500;

/** The line being said piece by piece: the piece to play next, and whether it has not arrived yet. */
interface ClipQueue {
  id: string;
  index: number;
  waiting: boolean;
}

/** Loudness 0..1 of a block of PCM frames, on a perceptual (dB) scale. */
function loudness(sample: AudioSample): number {
  const frames = sample.channels[0]?.frames;
  if (!frames?.length) return 0;
  let sum = 0;
  for (const value of frames) sum += value * value;
  const db = 20 * Math.log10(Math.sqrt(sum / frames.length) + 1e-6);
  return Math.min(1, Math.max(0, (db + 48) / 40));
}

/** What of the line comes after its first `count` pieces: the part left unsaid when the rest never arrived. */
function textAfter(line: AiMessage, count: number): string {
  const said = line.clips?.[count - 1];
  if (!said) return line.text;
  const end = line.text.indexOf(said.text);
  return end < 0 ? '' : line.text.slice(end + said.text.length).trim();
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
 * Plays the tutor's lines aloud: the synthesized audio that came with the message (whole, or in
 * pieces played back to back as they arrive), or, when there is none (mock backend, TTS failure), the
 * device's text-to-speech in the studied language, pitched and paced for the tutor's tone and the
 * line's emotion. `lipSync` is fed the spoken text, word boundaries, playback position and loudness
 * so the face moves with the voice.
 */
export function useTutorVoice(message: AiMessage | null, voiceState: VoiceState, lipSync: LipSync) {
  const { speechTag } = useStudyLanguage();
  const [speaking, setSpeaking] = useState(false);
  const talking = useRef(false);
  const spokenId = useRef<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<ClipQueue | null>(null);
  // Pieces arrive as new versions of the same message; the queue always reads the newest one.
  const latest = useRef<AiMessage | null>(message);
  const playClipRef = useRef<(index: number) => void>(() => undefined);

  useEffect(() => {
    latest.current = message;
  }, [message]);

  // Only real changes reach React: stopping a tutor who is already quiet re-renders nothing.
  const setTalking = useCallback((value: boolean) => {
    if (talking.current === value) return;
    talking.current = value;
    setSpeaking(value);
  }, []);

  const clearStartTimer = useCallback(() => {
    if (startTimer.current) clearTimeout(startTimer.current);
    startTimer.current = null;
  }, []);

  const clearGraceTimer = useCallback(() => {
    if (graceTimer.current) clearTimeout(graceTimer.current);
    graceTimer.current = null;
  }, []);

  const disposePlayer = useCallback(() => {
    clearStartTimer();
    if (player.current) {
      player.current.pause();
      player.current.remove();
      player.current = null;
    }
  }, [clearStartTimer]);

  const stop = useCallback(() => {
    queue.current = null;
    clearGraceTimer();
    Speech.stop();
    lipSync.stop();
    disposePlayer();
    setTalking(false);
  }, [lipSync, clearGraceTimer, disposePlayer, setTalking]);

  /** Reads `line.text` with the device voice; `then` runs once it has been said in full. */
  const speakWithDevice = useCallback(
    async (line: AiMessage, then?: () => void) => {
      const spoken = stripEmoji(line.text);
      const voice = await getDeviceVoiceId(speechTag);
      // Read at speaking time, so a tone picked mid-chat is heard on the next line.
      const { pitch, rate } = voiceStyleFor(useSettingsStore.getState().tutorTone, line.emotion);
      lipSync.load(spoken, rate);
      const finish = () => {
        lipSync.stop();
        setTalking(false);
      };
      const done = () => {
        lipSync.stop();
        if (then) then();
        else setTalking(false);
      };
      Speech.speak(spoken, {
        language: speechTag,
        voice,
        pitch,
        rate,
        onStart: () => {
          lipSync.start();
          setTalking(true);
        },
        // Native: { charIndex, charLength }; web: a SpeechSynthesisEvent with the same fields.
        onBoundary: (event: { charIndex?: number; charLength?: number }) => {
          if (typeof event?.charIndex === 'number') lipSync.boundary(event.charIndex, event.charLength);
        },
        onDone: done,
        onError: done,
        // Stopped on purpose (the learner took the floor): nothing more is said.
        onStopped: finish,
      });
    },
    [lipSync, speechTag, setTalking],
  );

  /**
   * Plays one recording of `text`. `then` runs when it has played to the end (a piece of a line);
   * without it, the line is over. A recording that will not play is read by the device voice instead.
   */
  const playFile = useCallback(
    (uri: string, text: string, line: AiMessage, then?: () => void) => {
      try {
        const next = createAudioPlayer({ uri });
        player.current = next;
        lipSync.load(stripEmoji(text));
        let started = false;
        const fallBack = (reason: string) => {
          if (started || player.current !== next) return;
          if (__DEV__) console.warn(`Tutor audio failed (${reason}):`, uri);
          disposePlayer();
          lipSync.stop();
          void speakWithDevice({ ...line, text }, then);
        };
        startTimer.current = setTimeout(() => fallBack('timeout'), AUDIO_START_TIMEOUT_MS);
        next.addListener('playbackStatusUpdate', (status) => {
          if (status.error) return fallBack(status.error);
          if (status.playing && !started) {
            started = true;
            clearStartTimer();
            lipSync.start();
            setTalking(true);
          }
          if (status.duration > 0) lipSync.sync(status.currentTime, status.duration);
          if (status.didJustFinish) {
            lipSync.stop();
            next.remove();
            if (player.current === next) player.current = null;
            if (then) then();
            else setTalking(false);
          }
        });
        next.addListener('audioSampleUpdate', (sample) => {
          lipSync.level(loudness(sample));
          if (next.duration > 0) lipSync.sync(sample.timestamp, next.duration);
        });
        void enableSampling(next);
        next.play();
      } catch {
        void speakWithDevice({ ...line, text }, then);
      }
    },
    [lipSync, speakWithDevice, disposePlayer, clearStartTimer, setTalking],
  );

  const play = useCallback(
    (line: AiMessage) => {
      stop();
      if (!line.audioUri || !PLAYABLE_URI.test(line.audioUri)) {
        if (__DEV__ && line.audioUri) console.warn('Unplayable tutor audio URL:', line.audioUri);
        void speakWithDevice(line);
        return;
      }
      playFile(line.audioUri, line.text, line);
    },
    [stop, speakWithDevice, playFile],
  );

  const playClip = useCallback(
    (index: number) => {
      const current = queue.current;
      const line = latest.current;
      if (!current || !line || line.id !== current.id) return;
      current.index = index;

      const clip = line.clips?.[index];
      if (!clip) {
        // The next piece is still being made: pick up from here when it arrives.
        if (line.audioPending) {
          current.waiting = true;
          return;
        }
        queue.current = null;
        const rest = textAfter(line, index);
        if (rest) void speakWithDevice({ ...line, text: rest });
        else setTalking(false);
        return;
      }

      current.waiting = false;
      const next = () => playClipRef.current(index + 1);
      if (clip.uri && PLAYABLE_URI.test(clip.uri)) playFile(clip.uri, clip.text, line, next);
      else void speakWithDevice({ ...line, text: clip.text }, next);
    },
    [playFile, speakWithDevice, setTalking],
  );

  useEffect(() => {
    playClipRef.current = playClip;
  }, [playClip]);

  const playClips = useCallback(
    (line: AiMessage) => {
      stop();
      queue.current = { id: line.id, index: 0, waiting: false };
      playClip(0);
    },
    [stop, playClip],
  );

  useEffect(() => {
    // iOS mutes playback in silent mode unless the app's audio session allows it.
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
    return stop;
  }, [stop]);

  useEffect(() => {
    // Still being written: shown on screen, said once complete.
    if (!message || message.streaming) return;

    // Already saying this line in pieces: the piece it was waiting for may just have come.
    const current = queue.current;
    if (current?.id === message.id) {
      if (current.waiting) playClip(current.index);
      return;
    }
    if (message.id === spokenId.current) return;

    if (message.clips?.length) {
      clearGraceTimer();
      spokenId.current = message.id;
      playClips(message);
      return;
    }
    if (message.audioPending) {
      if (graceTimer.current) return;
      graceTimer.current = setTimeout(() => {
        graceTimer.current = null;
        if (spokenId.current === message.id) return;
        spokenId.current = message.id;
        play({ ...message, audioUri: undefined, clips: undefined });
      }, AUDIO_GRACE_MS);
      return;
    }
    clearGraceTimer();
    spokenId.current = message.id;
    play(message);
  }, [message, play, playClip, playClips, clearGraceTimer]);

  // The user takes the floor (or the tutor is preparing an answer): stop talking.
  useEffect(() => {
    if (voiceState === 'listening' || voiceState === 'thinking') stop();
  }, [voiceState, stop]);

  const replay = useCallback(() => {
    if (!message) return;
    if (message.clips?.length) playClips(message);
    else play(message);
  }, [message, play, playClips]);

  return { speaking, replay };
}
