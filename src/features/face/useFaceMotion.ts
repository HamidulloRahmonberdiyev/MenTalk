import { useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { AudioLevel, FaceEmotion, FaceState } from './types';

/** Animation values for the face. All live on the UI thread; React never re-renders for them. */
export interface FaceMotion {
  /** 0..1 slow oscillation (breathing / floating). */
  breathe: SharedValue<number>;
  /** 0..1 slower oscillation for a tiny sideways sway. */
  sway: SharedValue<number>;
  /** 0 open .. 1 closed. */
  blink: SharedValue<number>;
  /** -1..1 where the eyes look. */
  gazeX: SharedValue<number>;
  gazeY: SharedValue<number>;
  /** ~0.8..1.15 eye aperture. */
  eyeOpen: SharedValue<number>;
  /** 0..1 how much the eyes curve into smiling crescents. */
  smileEyes: SharedValue<number>;
  /** -0.3..1.1 mouth-corner lift. */
  smile: SharedValue<number>;
  /** -1..1 sideways mouth offset (a thoughtful smirk). */
  mouthShift: SharedValue<number>;
  /** 0..1 smoothed mouth opening. */
  mouth: SharedValue<number>;
  /** -1..1 brow height (negative = lowered / frowning, positive = raised). */
  browLift: SharedValue<number>;
  /** -1..1 brow slant (positive = inner ends raised, worried / sympathetic; negative = inner ends lowered, focused). */
  browTilt: SharedValue<number>;
  /** 0..1 extra lift on one brow only (a quizzical raised brow). */
  browAsym: SharedValue<number>;
  /** 0..1 one-shot pulse used by the happy / encouraging reactions. */
  reaction: SharedValue<number>;
  /** 0..1 how closed the right eye is for a wink (it bends into a smiling arch). */
  wink: SharedValue<number>;
  /** 0..1 mouth opening while not speaking (a surprised "oh"). */
  mouthOpen: SharedValue<number>;
}

interface Pose {
  smile: number;
  eyeOpen: number;
  smileEyes: number;
  mouthShift: number;
  browLift: number;
  browTilt: number;
  browAsym: number;
  /** Resting mouth opening when the tutor is not speaking. */
  mouthOpen?: number;
  gazeX: number;
  gazeY: number;
  /** Amplitude of the random gaze drift. */
  drift: number;
  /** Min/max ms between blinks. */
  blinkEvery: readonly [number, number];
}

const POSES: Record<FaceState, Pose> = {
  idle: { smile: 0.35, eyeOpen: 1, smileEyes: 0, mouthShift: 0, browLift: 0, browTilt: 0, browAsym: 0, gazeX: 0, gazeY: 0, drift: 1, blinkEvery: [2600, 5200] },
  listening: { smile: 0.2, eyeOpen: 1.12, smileEyes: 0, mouthShift: 0, browLift: 0.45, browTilt: 0.1, browAsym: 0, gazeX: 0, gazeY: -0.05, drift: 0.28, blinkEvery: [3400, 6400] },
  thinking: { smile: 0, eyeOpen: 0.9, smileEyes: 0, mouthShift: 0.4, browLift: 0.1, browTilt: -0.35, browAsym: 0.7, gazeX: 0.8, gazeY: -0.75, drift: 0.2, blinkEvery: [2800, 5600] },
  speaking: { smile: 0.3, eyeOpen: 1, smileEyes: 0, mouthShift: 0, browLift: 0.1, browTilt: 0, browAsym: 0, gazeX: 0, gazeY: 0, drift: 0.4, blinkEvery: [2400, 4600] },
  happy: { smile: 1, eyeOpen: 1, smileEyes: 1, mouthShift: 0, browLift: 0.55, browTilt: 0.1, browAsym: 0, gazeX: 0, gazeY: 0, drift: 0.1, blinkEvery: [3200, 5400] },
  encouraging: { smile: 0.65, eyeOpen: 0.96, smileEyes: 0.35, mouthShift: 0, browLift: 0.4, browTilt: 0.35, browAsym: 0, gazeX: 0, gazeY: 0, drift: 0.25, blinkEvery: [3000, 5200] },
  wink: { smile: 0.9, eyeOpen: 1, smileEyes: 0, mouthShift: 0.25, browLift: 0.3, browTilt: 0.05, browAsym: 0, gazeX: 0, gazeY: 0, drift: 0.1, blinkEvery: [3200, 5400] },
  surprised: { smile: 0, eyeOpen: 1.28, smileEyes: 0, mouthShift: 0, browLift: 1, browTilt: 0.1, browAsym: 0, mouthOpen: 0.42, gazeX: 0, gazeY: 0, drift: 0.05, blinkEvery: [4200, 7000] },
};

type EmotionOffset = Partial<Pick<Pose, 'smile' | 'eyeOpen' | 'smileEyes' | 'mouthShift' | 'browLift' | 'browTilt' | 'browAsym' | 'mouthOpen'>>;

const EMOTIONS: Record<FaceEmotion, EmotionOffset> = {
  neutral: {},
  happy: { smile: 0.35, smileEyes: 0.5, browLift: 0.25 },
  encouraging: { smile: 0.2, smileEyes: 0.2, browLift: 0.15, browTilt: 0.15 },
  curious: { eyeOpen: 0.1, smile: -0.05, mouthShift: 0.2, browLift: 0.35, browAsym: 0.8 },
  empathetic: { eyeOpen: -0.06, smile: -0.12, browLift: 0.1, browTilt: 0.8 },
  surprised: { eyeOpen: 0.22, smile: 0.1, browLift: 0.8, mouthOpen: 0.3 },
  playful: { smile: 0.4, smileEyes: 0.25, browLift: 0.3, browAsym: 0.5, mouthShift: 0.3 },
};

const BLEND = { duration: 520, easing: Easing.out(Easing.cubic) } as const;
const GAZE = { duration: 650, easing: Easing.inOut(Easing.quad) } as const;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Keeps quiet speech visible without slamming the mouth fully open. */
function shapeLevel(level: number): number {
  'worklet';
  return Math.pow(Math.min(Math.max(level, 0), 1), 0.7) * 0.95;
}

export function useFaceMotion(state: FaceState, emotion: FaceEmotion, audioLevel?: AudioLevel): FaceMotion {
  const breathe = useSharedValue(0);
  const sway = useSharedValue(0.5);
  const blink = useSharedValue(0);
  const gazeX = useSharedValue(0);
  const gazeY = useSharedValue(0);
  const eyeOpen = useSharedValue(1);
  const smileEyes = useSharedValue(0);
  const smile = useSharedValue(0.35);
  const mouthShift = useSharedValue(0);
  const browLift = useSharedValue(0);
  const browTilt = useSharedValue(0);
  const browAsym = useSharedValue(0);
  const reaction = useSharedValue(0);
  const wink = useSharedValue(0);
  const mouthOpen = useSharedValue(0);

  const speaking = useSharedValue(0);
  const hasAudio = useSharedValue(0);
  const numericLevel = useSharedValue(0);
  const talkPhase = useSharedValue(0);

  const levelSource = typeof audioLevel === 'object' ? audioLevel : numericLevel;

  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    sway.value = withRepeat(withTiming(1, { duration: 5400, easing: Easing.inOut(Easing.sin) }), -1, true);
    talkPhase.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.linear }), -1, false);
  }, [breathe, sway, talkPhase]);

  useEffect(() => {
    if (typeof audioLevel === 'number') numericLevel.value = audioLevel;
    hasAudio.value = audioLevel === undefined ? 0 : 1;
  }, [audioLevel, numericLevel, hasAudio]);

  // State + emotion -> target expression.
  useEffect(() => {
    const pose = POSES[state];
    const offset = EMOTIONS[emotion];
    speaking.value = state === 'speaking' ? 1 : 0;

    smile.value = withTiming(pose.smile + (offset.smile ?? 0), BLEND);
    eyeOpen.value = withTiming(pose.eyeOpen + (offset.eyeOpen ?? 0), BLEND);
    smileEyes.value = withTiming(Math.min(1, pose.smileEyes + (offset.smileEyes ?? 0)), BLEND);
    mouthShift.value = withTiming(pose.mouthShift + (offset.mouthShift ?? 0), BLEND);
    browLift.value = withTiming(pose.browLift + (offset.browLift ?? 0), BLEND);
    browTilt.value = withTiming(pose.browTilt + (offset.browTilt ?? 0), BLEND);
    browAsym.value = withTiming(pose.browAsym + (offset.browAsym ?? 0), BLEND);
    gazeX.value = withTiming(pose.gazeX, { duration: 600, easing: Easing.out(Easing.cubic) });
    gazeY.value = withTiming(pose.gazeY, { duration: 600, easing: Easing.out(Easing.cubic) });
    mouthOpen.value = withTiming((pose.mouthOpen ?? 0) + (offset.mouthOpen ?? 0), BLEND);

    if (state === 'happy' || state === 'encouraging' || state === 'surprised') {
      reaction.value = withSequence(withTiming(1, { duration: 180 }), withSpring(0, { damping: 9, stiffness: 120 }));
    }
    // A wink is a held beat that opens again by itself, so it also works as a one-off flourish on a playful line.
    if (state === 'wink' || emotion === 'playful') {
      wink.value = withSequence(withDelay(260, withTiming(1, { duration: 140 })), withDelay(700, withTiming(0, { duration: 220 })));
    }
  }, [state, emotion, smile, eyeOpen, smileEyes, mouthShift, browLift, browTilt, browAsym, gazeX, gazeY, reaction, speaking, wink, mouthOpen]);

  // Random blinking and gaze drift: a couple of JS timers that only write shared values.
  useEffect(() => {
    const pose = POSES[state];
    let blinkTimer: ReturnType<typeof setTimeout>;
    let gazeTimer: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        const close = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 130 }));
        blink.value = Math.random() < 0.15 ? withSequence(close, withTiming(0, { duration: 90 }), close) : close;
        scheduleBlink();
      }, rand(pose.blinkEvery[0], pose.blinkEvery[1]));
    };

    const scheduleGaze = () => {
      gazeTimer = setTimeout(() => {
        gazeX.value = withTiming(pose.gazeX + rand(-1, 1) * 0.5 * pose.drift, GAZE);
        gazeY.value = withTiming(pose.gazeY + rand(-1, 1) * 0.3 * pose.drift, GAZE);
        scheduleGaze();
      }, rand(1500, 3600));
    };

    scheduleBlink();
    scheduleGaze();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(gazeTimer);
      cancelAnimation(blink);
    };
  }, [state, blink, gazeX, gazeY]);

  const mouth = useDerivedValue(() => {
    if (!speaking.value) return withTiming(mouthOpen.value, { duration: 140 });
    let level: number;
    if (hasAudio.value) {
      level = levelSource.value;
    } else {
      // No audio supplied: speech-like envelope from two sines.
      const t = talkPhase.value * Math.PI * 2;
      level = Math.abs(Math.sin(t * 5.3)) * (0.45 + 0.35 * Math.sin(t * 2)) + 0.12;
    }
    return withTiming(shapeLevel(level), { duration: 70 });
  });

  return { breathe, sway, blink, gazeX, gazeY, eyeOpen, smileEyes, smile, mouthShift, mouth, browLift, browTilt, browAsym, reaction, wink, mouthOpen };
}
