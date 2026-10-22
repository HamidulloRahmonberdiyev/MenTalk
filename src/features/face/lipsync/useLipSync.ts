import { useMemo, useRef } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { CueKind, SentenceKind, buildSpeechTrack, sampleTrack, sentenceAt, type Shape, type SpeechTrack } from './visemes';

/** Everything the face reads from speech. All values live on the UI thread and are smoothed. */
export interface SpeechFace {
  /** 1 while a line is being spoken (the lips follow the track), else 0. */
  active: SharedValue<number>;
  jaw: SharedValue<number>;
  spread: SharedValue<number>;
  round: SharedValue<number>;
  teeth: SharedValue<number>;
  tongue: SharedValue<number>;
  /** 0..1 slow loudness envelope, for the voice bars and body motion. */
  energy: SharedValue<number>;
  /** Extra brow lift from stress and questions. */
  brow: SharedValue<number>;
  /** Extra inner-brow raise (sympathy). */
  care: SharedValue<number>;
  /** Extra smile from warm or exclaimed sentences. */
  smile: SharedValue<number>;
  /** Head nod in radians (positive = down) from stressed words. */
  nod: SharedValue<number>;
  /** Phrase-level head turn and tilt in radians. */
  yaw: SharedValue<number>;
  roll: SharedValue<number>;
  /** 0..1 blink triggered at pauses. */
  blink: SharedValue<number>;
}

export interface LipSync {
  face: SpeechFace;
  /** Prepare a line before it is spoken. `rate` is the TTS speaking rate (1 = normal). */
  load: (text: string, rate?: number) => void;
  /** Speech has started; the timeline begins to run. */
  start: () => void;
  /** The device voice reached a word (`charIndex` into the loaded text). */
  boundary: (charIndex: number, charLength?: number) => void;
  /** Playback position of a synthesized file, in seconds. */
  sync: (position: number, duration: number) => void;
  /** Real loudness of the voice, 0..1. */
  level: (value: number) => void;
  stop: () => void;
}

/** Seconds of rest pose added around boundary-limited words, so short TTS hiccups don't freeze the lips open. */
const WORD_SLACK = 0.12;

/**
 * Drives the tutor's lips and speech-related expressions from the line being spoken.
 *
 *   const lipSync = useLipSync();
 *   lipSync.load(text, 0.95); lipSync.start(); // + boundary()/sync()/level() as the voice plays
 *   <TutorAvatar speech={lipSync.face} ... />
 */
export function useLipSync(): LipSync {
  const track = useSharedValue<SpeechTrack | null>(null);
  const playing = useSharedValue(0);
  const clock = useSharedValue(0);
  /** Timeline seconds per real second. Calibrated against word boundaries / file length. */
  const speed = useSharedValue(1);
  /** The clock may not run past this until the voice reports the next word. */
  const limit = useSharedValue(Number.POSITIVE_INFINITY);
  /** Real loudness 0..1, or -1 when the platform can't sample the voice. */
  const amp = useSharedValue(-1);
  const cueIndex = useSharedValue(0);

  const active = useSharedValue(0);
  const jaw = useSharedValue(0);
  const spread = useSharedValue(0);
  const round = useSharedValue(0);
  const teeth = useSharedValue(0);
  const tongue = useSharedValue(0);
  const energy = useSharedValue(0);
  const brow = useSharedValue(0);
  const care = useSharedValue(0);
  const smile = useSharedValue(0);
  const nod = useSharedValue(0);
  const yaw = useSharedValue(0);
  const roll = useSharedValue(0);
  const blink = useSharedValue(0);
  // Impulses that decay by themselves and the phrase-level head targets.
  const browKick = useSharedValue(0);
  const nodKick = useSharedValue(0);
  const blinkKick = useSharedValue(0);
  const yawTarget = useSharedValue(0);
  const rollTarget = useSharedValue(0);
  const phrase = useSharedValue(0);

  useFrameCallback((frame) => {
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 64) / 1000;
    const tr = track.value;
    const on = playing.value === 1 && tr !== null;
    const target: Shape = { jaw: 0, spread: 0, round: 0, teeth: 0, tongue: 0 };
    let browTarget = 0;
    let careTarget = 0;
    let smileTarget = 0;

    if (on && tr) {
      clock.value = Math.min(clock.value + dt * speed.value, limit.value);
      const now = clock.value;
      sampleTrack(tr, now, target);

      if (amp.value >= 0) {
        // Real voice available: silence closes the mouth, loud syllables open it wider.
        const gate = Math.min(1, Math.max(0, (amp.value - 0.04) / 0.3));
        target.jaw *= 0.2 + gate * 1.05;
      }

      // Fire the cues we've passed (only the latest of a kind if the clock jumped).
      while (cueIndex.value < tr.cueT.length && tr.cueT[cueIndex.value] <= now) {
        const i = cueIndex.value;
        const strength = tr.cueStrength[i];
        const kind = tr.cueKind[i];
        if (kind === CueKind.Emphasis) {
          browKick.value = Math.max(browKick.value, strength);
          nodKick.value = Math.max(nodKick.value, strength);
        } else if (kind === CueKind.PhraseEnd) {
          if (strength >= 1 || Math.random() < 0.5) blinkKick.value = 1;
          nodKick.value = Math.max(nodKick.value, 0.5 * strength);
        } else if (kind === CueKind.PhraseStart) {
          // Speakers re-orient their head on each new phrase.
          phrase.value += 1;
          const side = phrase.value % 2 === 0 ? 1 : -1;
          yawTarget.value = side * (0.05 + Math.random() * 0.07);
          rollTarget.value = -side * (0.02 + Math.random() * 0.03);
        }
        cueIndex.value = i + 1;
      }

      // Intonation: questions lift the brows towards their end, exclamations and warm words smile.
      const s = sentenceAt(tr, now);
      if (s >= 0) {
        const kind = tr.sentKind[s];
        const progress = Math.min(1, Math.max(0, (now - tr.sentT0[s]) / Math.max(0.2, tr.sentT1[s] - tr.sentT0[s])));
        if (kind === SentenceKind.Question) {
          browTarget = 0.25 + 0.55 * progress * progress;
          rollTarget.value = 0.09;
        } else if (kind === SentenceKind.Exclamation) {
          browTarget = 0.35;
        } else if (kind === SentenceKind.Trailing) {
          browTarget = 0.15;
        }
        smileTarget = tr.sentSmile[s];
        careTarget = tr.sentCare[s];
      }
    } else {
      yawTarget.value = 0;
      rollTarget.value = 0;
    }

    // Critically damped smoothing: fast for the jaw, slower for lip shape, slow for the head.
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    jaw.value += (target.jaw - jaw.value) * ease(38);
    spread.value += (target.spread - spread.value) * ease(18);
    round.value += (target.round - round.value) * ease(18);
    teeth.value += (target.teeth - teeth.value) * ease(20);
    tongue.value += (target.tongue - tongue.value) * ease(16);
    energy.value += (jaw.value - energy.value) * ease(4);
    active.value += ((on ? 1 : 0) - active.value) * ease(10);

    browKick.value *= Math.exp(-dt * 3.2);
    nodKick.value *= Math.exp(-dt * 4);
    blinkKick.value = Math.max(0, blinkKick.value - dt * 6);
    brow.value += (browTarget + browKick.value * 0.6 - brow.value) * ease(9);
    care.value += (careTarget - care.value) * ease(4);
    smile.value += (smileTarget - smile.value) * ease(3);
    // The nod dips and returns: a decaying impulse shaped by its own sine.
    nod.value = nodKick.value * Math.sin(Math.min(1, nodKick.value) * Math.PI) * 0.09 + energy.value * 0.025;
    yaw.value += (yawTarget.value - yaw.value) * ease(2.2);
    roll.value += (rollTarget.value - roll.value) * ease(2.2);
    blink.value = blinkKick.value > 0.5 ? (1 - blinkKick.value) * 2 : blinkKick.value * 2;
  });

  /** Last word boundary from the device voice: timeline time and wall-clock ms. */
  const lastBoundary = useRef<{ time: number; at: number } | null>(null);

  return useMemo<LipSync>(() => {
    return {
      face: { active, jaw, spread, round, teeth, tongue, energy, brow, care, smile, nod, yaw, roll, blink },
      load: (text, rate = 1) => {
        track.set(buildSpeechTrack(text));
        playing.set(0);
        clock.set(0);
        cueIndex.set(0);
        speed.set(rate);
        limit.set(Number.POSITIVE_INFINITY);
        amp.set(-1);
        lastBoundary.current = null;
      },
      start: () => {
        playing.set(1);
      },
      boundary: (charIndex, charLength = 0) => {
        const tr = track.get();
        if (!tr) return;
        const index = Math.min(Math.max(charIndex, 0), tr.charTime.length - 1);
        const end = Math.min(index + Math.max(charLength, 1), tr.charTime.length - 1);
        const time = tr.charTime[index] ?? 0;
        const now = Date.now();
        // Learn the real speaking rate from consecutive words.
        const previous = lastBoundary.current;
        if (previous && time > previous.time) {
          const real = (now - previous.at) / 1000;
          if (real > 0.05) {
            const ratio = (time - previous.time) / real;
            speed.set(Math.min(2.2, Math.max(0.45, speed.get() * 0.6 + ratio * 0.4)));
          }
        }
        lastBoundary.current = { time, at: now };
        clock.set(time);
        limit.set((tr.charTime[end] ?? tr.duration) + WORD_SLACK);
        playing.set(1);
      },
      sync: (position, duration) => {
        const tr = track.get();
        if (!tr || !(duration > 0)) return;
        speed.set(tr.duration / duration);
        clock.set(position * (tr.duration / duration));
        limit.set(Number.POSITIVE_INFINITY);
      },
      level: (value) => {
        amp.set(value);
      },
      stop: () => {
        playing.set(0);
        limit.set(Number.POSITIVE_INFINITY);
      },
    };
  }, [
    active, jaw, spread, round, teeth, tongue, energy, brow, care, smile, nod, yaw, roll, blink,
    track, playing, clock, cueIndex, speed, limit, amp,
  ]);
}
