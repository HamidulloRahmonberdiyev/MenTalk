import { createAudioPlayer, getRecordingPermissionsAsync, setAudioModeAsync, type AudioPlayer, type AudioSample } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { LipSync } from '@/features/face';
import { getDeviceVoiceId } from '@/services/speech/deviceVoice';
import { voiceStyleFor } from '@/services/speech/voiceStyle';
import { stripEmoji } from '@/services/text';
import { activeTutorTone, useSettingsStore, useStudyLanguage } from '@/store/settingsStore';
import type { AiMessage, VoiceState } from '@/types';

const PLAYABLE_URI = /^(https?|file):\/\//i;
/** A recording that has not started by then (stalled download, bad file) is tried once more. */
const AUDIO_START_TIMEOUT_MS = 8_000;
/**
 * The longest wait for a voice the server said is on its way. It normally comes within seconds, and
 * the session stops waiting when the turn's stream ends; this only guards against a stream that hangs.
 */
const AUDIO_WAIT_MS = 20_000;
/** Device speech that never reports its end (some engines, a missing language) is called finished after its expected length plus this. */
const DEVICE_SPEECH_SLACK_MS = 5_000;
/** Well above real speech (~65 ms a character), so a slow voice is never cut off. */
const DEVICE_MS_PER_CHAR = 120;

/**
 * Which voice this conversation speaks with. The tutor is one person, so a conversation keeps one voice.
 * In a server-voiced chat (`fetchVoice` given) that is always the server's: a line whose voice is
 * missing is asked for again, and left unsaid (its text is on screen) if it still does not come; the
 * device never reads it. Otherwise the chat keeps the voice its first line was said in.
 */
type VoiceSource = 'server' | 'device';

/** A voice to ask for again once its line is stored (the line's id comes right after its first piece). */
interface PendingRecovery {
  id: string;
  text: string;
  then: () => void;
  generation: number;
}

/** What the tutor is doing: waiting for the voice of a line that has arrived, or saying it. */
type Phase = 'quiet' | 'preparing' | 'speaking';

/** The line being said piece by piece: the piece to play next, and whether it has not arrived yet. */
interface ClipQueue {
  id: string;
  index: number;
  waiting: boolean;
}

export interface TutorVoiceOptions {
  /** The tutor said a whole line to its end (it was not cut off): the learner's turn. */
  onLineEnd?: () => void;
  /** A line, or the rest of one, had no voice and was left unsaid. */
  onVoiceMissing?: () => void;
  /**
   * Server-voiced chats: asks the server for the voice of a stored line (or part of it) that did not
   * arrive. Without it the device voice stands in, as in chats that have no server voice at all.
   */
  fetchVoice?: (turnId: number, text: string) => Promise<string | null>;
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

const hasServerVoice = (line: AiMessage) => Boolean(line.clips?.length) || Boolean(line.audioUri && PLAYABLE_URI.test(line.audioUri));

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
 * Says the tutor's lines aloud: the recording that came with the line (whole, or in pieces played back
 * to back as they arrive), or the device's text-to-speech in a conversation that has no recordings
 * (mock backend, speech turned off). `lipSync` is fed the spoken text, word boundaries, playback
 * position and loudness so the face moves with the voice.
 *
 * Every callback of a player or an utterance is tied to the `generation` it was started in; `stop()`
 * starts a new one, so a voice that was cut off can never end, or restart, a newer line.
 */
export function useTutorVoice(message: AiMessage | null, voiceState: VoiceState, lipSync: LipSync, options: TutorVoiceOptions = {}) {
  const { speechTag } = useStudyLanguage();
  const [phase, setPhaseState] = useState<Phase>('quiet');
  const phaseRef = useRef<Phase>('quiet');
  const source = useRef<VoiceSource | null>(null);
  const generation = useRef(0);
  const player = useRef<AudioPlayer | null>(null);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<ClipQueue | null>(null);
  /** The last line dealt with: said, being said whole, or dropped because the learner took the floor. */
  const handled = useRef<string | null>(null);
  /** The line whose voice is awaited before it is said. */
  const awaiting = useRef<string | null>(null);
  // Pieces arrive as new versions of the same message; the queue always reads the newest one.
  const latest = useRef<AiMessage | null>(message);
  const callbacks = useRef(options);
  const playClipRef = useRef<(index: number) => void>(() => undefined);
  const playFileRef = useRef<(uri: string, text: string, line: AiMessage, then: () => void, unplayable?: () => void) => void>(() => undefined);
  const pendingRecovery = useRef<PendingRecovery | null>(null);

  useEffect(() => {
    latest.current = message;
  }, [message]);

  useEffect(() => {
    callbacks.current = options;
  });

  // Only real changes reach React: stopping a tutor who is already quiet re-renders nothing.
  const setPhase = useCallback((next: Phase) => {
    if (phaseRef.current === next) return;
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const clearWaitTimer = useCallback(() => {
    if (waitTimer.current) clearTimeout(waitTimer.current);
    waitTimer.current = null;
  }, []);

  const disposePlayer = useCallback(() => {
    if (startTimer.current) clearTimeout(startTimer.current);
    startTimer.current = null;
    if (player.current) {
      player.current.pause();
      player.current.remove();
      player.current = null;
    }
  }, []);

  /** Silences the tutor at once. Nothing that was playing reports back afterwards. */
  const stop = useCallback(() => {
    generation.current += 1;
    queue.current = null;
    awaiting.current = null;
    pendingRecovery.current = null;
    clearWaitTimer();
    Speech.stop();
    lipSync.stop();
    disposePlayer();
    setPhase('quiet');
  }, [lipSync, clearWaitTimer, disposePlayer, setPhase]);

  /** The line has been said to its end. */
  const finishLine = useCallback(() => {
    queue.current = null;
    clearWaitTimer();
    lipSync.stop();
    setPhase('quiet');
    callbacks.current.onLineEnd?.();
  }, [lipSync, clearWaitTimer, setPhase]);

  /** Reads `text` with the device voice; `then` runs once it has been said (or could not be). */
  const speakWithDevice = useCallback(
    async (line: AiMessage, text: string, then: () => void) => {
      const gen = generation.current;
      const spoken = stripEmoji(text).trim();
      if (!spoken) return then();
      const voice = await getDeviceVoiceId(speechTag);
      if (gen !== generation.current) return;
      // Read at speaking time, so a tone picked mid-chat is heard on the next line.
      const { pitch, rate } = voiceStyleFor(activeTutorTone(useSettingsStore.getState()), line.emotion);
      const current = () => gen === generation.current;
      let settled = false;
      const done = () => {
        if (settled || !current()) return;
        settled = true;
        clearTimeout(watchdog);
        lipSync.stop();
        then();
      };
      // Silenced first, so the microphone that may open next never hears the end of it.
      const watchdog = setTimeout(() => {
        Speech.stop();
        done();
      }, (spoken.length * DEVICE_MS_PER_CHAR) / rate + DEVICE_SPEECH_SLACK_MS);
      lipSync.load(spoken, rate);
      Speech.speak(spoken, {
        language: speechTag,
        voice,
        pitch,
        rate,
        onStart: () => {
          if (!current()) return;
          lipSync.start();
          setPhase('speaking');
        },
        // Native: { charIndex, charLength }; web: a SpeechSynthesisEvent with the same fields.
        onBoundary: (event: { charIndex?: number; charLength?: number }) => {
          if (current() && typeof event?.charIndex === 'number') lipSync.boundary(event.charIndex, event.charLength);
        },
        onDone: done,
        onError: done,
        // Our own stop() moved the generation on, so this only fires for a stop from elsewhere.
        onStopped: done,
      });
    },
    [lipSync, speechTag, setPhase],
  );

  /**
   * Server-voiced chat: `text` (a line, or the rest of one) came without its voice. It is asked for once
   * more and played; if it still does not come, it stays on screen unsaid and the learner is told so.
   */
  const recoverVoice = useCallback((line: AiMessage, text: string, then: () => void) => {
    const gen = generation.current;
    const newest = latest.current?.id === line.id ? latest.current : line;
    const fetchVoice = callbacks.current.fetchVoice;
    const giveUp = () => {
      if (gen !== generation.current) return;
      callbacks.current.onVoiceMissing?.();
      then();
    };

    if (!fetchVoice) return giveUp();
    if (newest.turnId === undefined) {
      // Not stored yet; its id arrives with the rest of the stream. Asked for again once it has.
      if (newest.audioPending) pendingRecovery.current = { id: line.id, text, then, generation: gen };
      else giveUp();
      return;
    }
    fetchVoice(newest.turnId, text).then((uri) => {
      if (gen !== generation.current) return;
      if (uri && PLAYABLE_URI.test(uri)) playFileRef.current(uri, text, newest, then, giveUp);
      else giveUp();
    }, giveUp);
  }, []);

  /**
   * `text` has no voice. In a server-voiced chat it is asked for again; otherwise the device reads it in
   * a device-voiced chat, and it is skipped in one that started with recordings.
   */
  const sayUnvoiced = useCallback(
    (line: AiMessage, text: string, then: () => void) => {
      if (callbacks.current.fetchVoice) {
        recoverVoice(line, text, then);
        return;
      }
      source.current ??= 'device';
      if (source.current === 'device') {
        void speakWithDevice(line, text, then);
        return;
      }
      callbacks.current.onVoiceMissing?.();
      then();
    },
    [speakWithDevice, recoverVoice],
  );

  /**
   * Plays one recording of `text`; `then` runs when it has played to the end. A recording that will not
   * play even on a second try goes to `unplayable` (by default: said some other way, see `sayUnvoiced`).
   */
  const playFile = useCallback(
    (uri: string, text: string, line: AiMessage, then: () => void, unplayable?: () => void) => {
      const cannotPlay = unplayable ?? (() => sayUnvoiced(line, text, then));
      const gen = generation.current;

      const attempt = (retried: boolean) => {
        let next: AudioPlayer;
        try {
          next = createAudioPlayer({ uri });
        } catch {
          cannotPlay();
          return;
        }
        player.current = next;
        lipSync.load(stripEmoji(text));
        let started = false;
        let settled = false;
        const mine = () => gen === generation.current && player.current === next;

        const end = () => {
          if (settled || !mine()) return;
          settled = true;
          lipSync.stop();
          disposePlayer();
          then();
        };
        const fail = (reason: string) => {
          if (settled || !mine()) return;
          // Cut short after it started: what was heard stands, and the line goes on.
          if (started) return end();
          settled = true;
          if (__DEV__) console.warn(`Tutor audio failed (${reason}):`, uri);
          lipSync.stop();
          disposePlayer();
          if (retried) cannotPlay();
          else attempt(true);
        };

        startTimer.current = setTimeout(() => fail('timeout'), AUDIO_START_TIMEOUT_MS);
        next.addListener('playbackStatusUpdate', (status) => {
          if (!mine()) return;
          if (status.error) return fail(status.error);
          if (status.playing && !started) {
            started = true;
            source.current ??= 'server';
            if (startTimer.current) clearTimeout(startTimer.current);
            startTimer.current = null;
            lipSync.start();
            setPhase('speaking');
          }
          if (status.duration > 0) lipSync.sync(status.currentTime, status.duration);
          if (status.didJustFinish) end();
        });
        next.addListener('audioSampleUpdate', (sample) => {
          if (!mine()) return;
          lipSync.level(loudness(sample));
          if (next.duration > 0) lipSync.sync(sample.timestamp, next.duration);
        });
        void enableSampling(next);
        next.play();
      };

      attempt(false);
    },
    [lipSync, sayUnvoiced, disposePlayer, setPhase],
  );

  /** Stops waiting for a voice after `AUDIO_WAIT_MS`; `giveUp` then says the line some other way. */
  const waitForVoice = useCallback(
    (giveUp: () => void) => {
      clearWaitTimer();
      const gen = generation.current;
      waitTimer.current = setTimeout(() => {
        waitTimer.current = null;
        if (gen === generation.current) giveUp();
      }, AUDIO_WAIT_MS);
    },
    [clearWaitTimer],
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
          if (!current.waiting) {
            current.waiting = true;
            waitForVoice(() => {
              if (queue.current !== current) return;
              queue.current = null;
              const rest = textAfter(line, index);
              if (rest) sayUnvoiced(line, rest, finishLine);
              else finishLine();
            });
          }
          return;
        }
        queue.current = null;
        const rest = textAfter(line, index);
        if (rest) sayUnvoiced(line, rest, finishLine);
        else finishLine();
        return;
      }

      current.waiting = false;
      clearWaitTimer();
      const next = () => playClipRef.current(index + 1);
      if (source.current === 'device') void speakWithDevice(line, clip.text, next);
      else if (clip.uri && PLAYABLE_URI.test(clip.uri)) playFile(clip.uri, clip.text, line, next);
      else sayUnvoiced(line, clip.text, next);
    },
    [playFile, speakWithDevice, sayUnvoiced, finishLine, waitForVoice, clearWaitTimer],
  );

  useEffect(() => {
    playClipRef.current = playClip;
  }, [playClip]);

  useEffect(() => {
    playFileRef.current = playFile;
  }, [playFile]);

  /** Starts saying `line` from the top, in this conversation's voice. */
  const begin = useCallback(
    (line: AiMessage) => {
      stop();
      handled.current = line.id;
      setPhase('preparing');

      if (source.current === 'device') {
        void speakWithDevice(line, line.text, finishLine);
      } else if (line.clips?.length) {
        queue.current = { id: line.id, index: 0, waiting: false };
        playClip(0);
      } else if (line.audioUri && PLAYABLE_URI.test(line.audioUri)) {
        playFile(line.audioUri, line.text, line, finishLine);
      } else if (line.audioPending) {
        // The text is here and its voice is on the way: wait for it rather than read it in another voice.
        handled.current = null;
        awaiting.current = line.id;
        waitForVoice(() => {
          awaiting.current = null;
          handled.current = line.id;
          sayUnvoiced(latest.current?.id === line.id ? latest.current : line, line.text, finishLine);
        });
      } else {
        if (__DEV__ && line.audioUri) console.warn('Unplayable tutor audio URL:', line.audioUri);
        sayUnvoiced(line, line.text, finishLine);
      }
    },
    [stop, setPhase, speakWithDevice, playClip, playFile, finishLine, waitForVoice, sayUnvoiced],
  );

  useEffect(() => {
    // iOS mutes playback in silent mode unless the app's audio session allows it.
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => undefined);
    return stop;
  }, [stop]);

  useEffect(() => {
    // Still being written: shown on screen, said once complete.
    if (!message || message.streaming) return;

    // A voice waiting to be asked for again: the line is stored now (or nothing more will come).
    const pending = pendingRecovery.current;
    if (pending?.id === message.id && (message.turnId !== undefined || !message.audioPending)) {
      pendingRecovery.current = null;
      if (pending.generation === generation.current) recoverVoice(message, pending.text, pending.then);
    }

    // Already saying this line in pieces: the piece it was waiting for may just have come.
    const current = queue.current;
    if (current?.id === message.id) {
      if (current.waiting) playClip(current.index);
      return;
    }
    if (message.id === handled.current) return;
    // Still waiting for this line's voice, and it has not come yet.
    if (message.id === awaiting.current && message.audioPending && !hasServerVoice(message)) return;
    begin(message);
  }, [message, begin, playClip, recoverVoice]);

  // The learner takes the floor (or the tutor is preparing an answer): stop talking, and drop the
  // current line, so a voice that arrives for it now is never played over the learner.
  useEffect(() => {
    if (voiceState !== 'listening' && voiceState !== 'thinking') return;
    stop();
    if (latest.current) handled.current = latest.current.id;
  }, [voiceState, stop]);

  const replay = useCallback(() => {
    if (message && !message.streaming) begin(message);
  }, [message, begin]);

  return { speaking: phase === 'speaking', preparing: phase === 'preparing', replay };
}
