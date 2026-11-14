import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { AIFaceProps, FaceState } from '@/features/face';
import { useFaceMotion, type FaceMotion } from '@/features/face/useFaceMotion';
import { colors } from '@/theme';
import { TUTOR_TONES, type TutorTone } from '@/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The whole face is laid out in a 220 x 108 box, measured off the reference: a flat capsule with a
 * 12-unit rim, two solid oval eyes a third of the way in from each side and a small half-moon mouth
 * between them, a little lower.
 */
const VIEW_W = 220;
const VIEW_H = 108;
const RIM = 12;
const EYE_X = [73.5, 146.5] as const;
const EYE_Y = 52;
const EYE_HALF_WIDTH = 13;
const EYE_HALF_HEIGHT = 18.5;
const BROW_HALF_WIDTH = 11;
const MOUTH_X = 110;
const MOUTH_TOP = 62;
const MOUTH_HALF_WIDTH = 13.5;
const MOUTH_DEPTH = 12;
/** The resting smile of the motion engine; at this value the mouth is exactly the reference half-moon. */
const REST_SMILE = 0.35;
const KAPPA = 0.5523;

/** Near-black navy features, as on the reference. */
const INK = '#0E1424';

/** Flat rim colour per tone, in TUTOR_TONES order: the app's sky blue, sunny amber, boiling red. */
const RIMS: Record<TutorTone, string> = {
  calm: colors.primary,
  funny: '#FFAE1A',
  angry: '#F0443A',
};
const GLOWS: Record<TutorTone, string> = {
  calm: 'rgba(42, 171, 238, 0.32)',
  funny: 'rgba(255, 174, 26, 0.34)',
  angry: 'rgba(240, 68, 58, 0.36)',
};
const RIM_COLORS = TUTOR_TONES.map((tone) => RIMS[tone]);
const GLOW_COLORS = TUTOR_TONES.map((tone) => GLOWS[tone]);
const TONE_STEPS = TUTOR_TONES.map((_, index) => index);

/** How the capsule floats per tone: calm drifts, funny bounces, angry barely moves (it shakes instead). */
const FLOAT: Record<TutorTone, { period: number; height: number; wobble: number }> = {
  calm: { period: 2600, height: 6, wobble: 0 },
  funny: { period: 1300, height: 10, wobble: 2.5 },
  angry: { period: 1800, height: 3, wobble: 0 },
};

/** How strongly the soft glow around the capsule breathes in each state. */
const GLOW: Record<FaceState, { opacity: number; period: number }> = {
  idle: { opacity: 0.55, period: 2800 },
  listening: { opacity: 1, period: 1100 },
  thinking: { opacity: 0.7, period: 1500 },
  speaking: { opacity: 0.85, period: 900 },
  happy: { opacity: 0.9, period: 1400 },
  encouraging: { opacity: 0.85, period: 1400 },
  wink: { opacity: 0.8, period: 1400 },
  surprised: { opacity: 1, period: 1000 },
};

const POP_STATES: readonly FaceState[] = ['happy', 'encouraging', 'wink', 'surprised'];

const ANGER_MARK = 'M9 3v3.5a2.5 2.5 0 0 1-2.5 2.5H3M15 3v3.5a2.5 2.5 0 0 0 2.5 2.5H21M9 21v-3.5a2.5 2.5 0 0 0-2.5-2.5H3M15 21v-3.5a2.5 2.5 0 0 1 2.5-2.5H21';
const SPARKLE = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z';

/** Eye outline as four cubic curves; a negative `bottom` bends the lower edge up into a smiling crescent. */
function eyePath(cx: number, cy: number, top: number, bottom: number): string {
  'worklet';
  const w = EYE_HALF_WIDTH;
  const k = KAPPA;
  return (
    `M${cx - w} ${cy} ` +
    `C${cx - w} ${cy - k * top} ${cx - k * w} ${cy - top} ${cx} ${cy - top} ` +
    `C${cx + k * w} ${cy - top} ${cx + w} ${cy - k * top} ${cx + w} ${cy} ` +
    `C${cx + w} ${cy + k * bottom} ${cx + k * w} ${cy + bottom} ${cx} ${cy + bottom} ` +
    `C${cx - k * w} ${cy + bottom} ${cx - w} ${cy + k * bottom} ${cx - w} ${cy} Z`
  );
}

function useEyeProps({ eyeOpen, blink, gazeX, gazeY, smileEyes, wink }: FaceMotion, index: 0 | 1) {
  return useAnimatedProps(() => {
    // Only the right eye winks; it bends into the same smiling crescent as a happy eye.
    const smiling = index === 1 ? Math.max(smileEyes.value, wink.value) : smileEyes.value;
    const open = Math.max(0.07, eyeOpen.value * (1 - blink.value * 0.93));
    const top = EYE_HALF_HEIGHT * open;
    const bottom = top * (1 - smiling * 1.65);
    const cx = EYE_X[index] + gazeX.value * 7;
    const cy = EYE_Y + gazeY.value * 5 + smiling * 4;
    return { d: eyePath(cx, cy, top, bottom) };
  });
}

/**
 * Like the reference the face has no brows; they only appear when it is cross (inner ends pulled
 * down), so the angry tone still reads at a glance.
 */
function useBrowProps({ eyeOpen, gazeX, browLift, browTilt }: FaceMotion, index: 0 | 1) {
  return useAnimatedProps(() => {
    const dir = index === 0 ? 1 : -1; // towards the face centre
    const cx = EYE_X[index] + gazeX.value * 4;
    const y = EYE_Y - EYE_HALF_HEIGHT * eyeOpen.value - 7 - browLift.value * 3;
    const tilt = browTilt.value * 3.5;
    return {
      d: `M${cx - dir * BROW_HALF_WIDTH} ${y + tilt * 0.4} L${cx + dir * BROW_HALF_WIDTH} ${y - tilt}`,
      strokeOpacity: Math.min(1, Math.max(0, (-browTilt.value - 0.6) * 1.4)),
    };
  });
}

/** Two solid oval eyes and the half-moon mouth, which grins, frowns and opens with the voice. */
function Features({ motion }: { motion: FaceMotion }) {
  const leftEye = useEyeProps(motion, 0);
  const rightEye = useEyeProps(motion, 1);
  const leftBrow = useBrowProps(motion, 0);
  const rightBrow = useBrowProps(motion, 1);

  const { smile, mouth, mouthShift } = motion;
  const mouthProps = useAnimatedProps(() => {
    const s = smile.value - REST_SMILE;
    const o = mouth.value;
    const cx = MOUTH_X + mouthShift.value * 5;
    const w = Math.max(8, MOUTH_HALF_WIDTH + s * 4 + o * 1.5);
    const top = MOUTH_TOP - s * 2;
    // At rest a flat top over a half-ellipse; a bigger smile deepens it, a frown flips the curve
    // above the line, and the voice lifts the top edge so it opens into an oval.
    const depth = Math.min(26, MOUTH_DEPTH + s * (s >= 0 ? 10 : 14)) + o * 10;
    const lift = o * 9;
    const k = KAPPA;
    return {
      d:
        `M${cx - w} ${top} ` +
        `Q${cx} ${top - lift * 2} ${cx + w} ${top} ` +
        `C${cx + w} ${top + depth * k} ${cx + w * k} ${top + depth} ${cx} ${top + depth} ` +
        `C${cx - w * k} ${top + depth} ${cx - w} ${top + depth * k} ${cx - w} ${top} Z`,
    };
  });

  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <AnimatedPath fill={INK} animatedProps={leftEye} />
      <AnimatedPath fill={INK} animatedProps={rightEye} />
      <AnimatedPath fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" animatedProps={leftBrow} />
      <AnimatedPath fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" animatedProps={rightBrow} />
      {/* A thin stroke in the same ink rounds the mouth's corners off, as on the reference. */}
      <AnimatedPath fill={INK} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" animatedProps={mouthProps} />
    </Svg>
  );
}

function Dot({ index, active, size, color }: { index: number; active: boolean; size: number; color: string }) {
  const lift = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(lift);
    if (!active) {
      lift.set(0);
      return;
    }
    lift.set(
      withDelay(
        index * 160,
        withRepeat(withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 280 }), withDelay(360, withTiming(0, { duration: 1 }))), -1),
      ),
    );
  }, [active, index, lift]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + lift.get() * 0.55, transform: [{ translateY: -lift.get() * size * 0.9 }] }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size, backgroundColor: color }, style]} />;
}

/** Three dots that pulse in sequence above the capsule's corner while it is thinking. */
function ThinkingDots({ visible, height, color }: { visible: boolean; height: number; color: string }) {
  const presence = useSharedValue(0);
  useEffect(() => {
    presence.set(withTiming(visible ? 1 : 0, { duration: 260 }));
  }, [visible, presence]);
  const style = useAnimatedStyle(() => ({ opacity: presence.get(), transform: [{ scale: 0.6 + presence.get() * 0.4 }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.dots, { top: -height * 0.42, right: -height * 0.12, gap: height * 0.05, padding: height * 0.08 }, style]}
    >
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} active={visible} size={height * 0.08} color={color} />
      ))}
    </Animated.View>
  );
}

/** Repeating 0..1 pulse that runs only while `active`, fading the badge in and out with it. */
function usePulse(active: boolean, period: number, delay = 0) {
  const shown = useSharedValue(0);
  const beat = useSharedValue(0);
  useEffect(() => {
    shown.set(withSpring(active ? 1 : 0, { damping: 11, stiffness: 160 }));
    cancelAnimation(beat);
    beat.set(0);
    if (active) beat.set(withDelay(delay, withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [active, period, delay, shown, beat]);
  return { shown, beat };
}

/** The manga "popping vein" that throbs over the angry tutor's corner. */
function AngerMark({ active, height }: { active: boolean; height: number }) {
  const { shown, beat } = usePulse(active, 420);
  const style = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ scale: shown.get() * (0.86 + beat.get() * 0.22) }] }));
  const box = height * 0.42;
  return (
    <Animated.View pointerEvents="none" style={[styles.badge, { width: box, height: box, top: -box * 0.4, right: height * 0.1 }, style]}>
      <Svg width="100%" height="100%" viewBox="-2 -2 28 28">
        <Path d={ANGER_MARK} fill="none" stroke="#FFFFFF" strokeWidth={6.5} strokeLinecap="round" />
        <Path d={ANGER_MARK} fill="none" stroke="#C4140C" strokeWidth={3.4} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Sparkle({ active, size, delay, style: position }: { active: boolean; size: number; delay: number; style: object }) {
  const { shown, beat } = usePulse(active, 650, delay);
  const style = useAnimatedStyle(() => ({
    opacity: shown.get() * (0.35 + beat.get() * 0.65),
    transform: [{ scale: shown.get() * (0.6 + beat.get() * 0.5) }, { rotate: `${beat.get() * 45}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.badge, { width: size, height: size }, position, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 24 24">
        <Path d={SPARKLE} fill="#FFFFFF" stroke="#F59E0B" strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

/**
 * The default tutor: a flat white capsule in a thick coloured rim, with two solid oval eyes and a
 * small half-moon smile. The rim colour and the temperament follow the conversation tone (blue and
 * gentle, amber and bouncy, red and fuming); the face runs on the same motion engine as every other
 * tutor face. `size` is the capsule's width.
 */
export const PillTutor = memo(function PillTutor({
  state,
  emotion = 'neutral',
  audioLevel,
  size = 200,
  tone = 'calm',
}: AIFaceProps & { size?: number; tone?: TutorTone }) {
  const motion = useFaceMotion(state, emotion, audioLevel, tone);
  const toneStep = useSharedValue(TUTOR_TONES.indexOf(tone));
  const float = useSharedValue(0);
  const glow = useSharedValue(0);
  const lean = useSharedValue(0);
  const pop = useSharedValue(0);
  const shake = useSharedValue(0);
  const drift = FLOAT[tone];
  const { opacity } = GLOW[state];
  const period = GLOW[state].period * (tone === 'angry' ? 0.6 : 1);
  const angry = tone === 'angry';
  const speaking = state === 'speaking';

  const width = size;
  const height = Math.round((size * VIEW_H) / VIEW_W);
  const rim = (height * RIM) / VIEW_H;
  const { mouth } = motion;

  // A tone change glides the rim from one colour to the next instead of snapping.
  useEffect(() => {
    toneStep.set(withTiming(TUTOR_TONES.indexOf(tone), { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [tone, toneStep]);

  useEffect(() => {
    cancelAnimation(float);
    float.set(0);
    float.set(withRepeat(withTiming(1, { duration: drift.period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [float, drift.period]);

  useEffect(() => {
    cancelAnimation(glow);
    glow.set(0);
    glow.set(withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [glow, period]);

  // Angry: a constant tremble while it talks, and an irritated huff every couple of seconds otherwise.
  useEffect(() => {
    cancelAnimation(shake);
    shake.set(0);
    if (!angry) return;
    const jolt = withSequence(withTiming(1, { duration: 45 }), withTiming(-1, { duration: 90 }), withTiming(0.6, { duration: 80 }), withTiming(0, { duration: 60 }));
    shake.set(withRepeat(withSequence(jolt, withDelay(speaking ? 40 : 1900, withTiming(0, { duration: 1 }))), -1));
  }, [angry, speaking, shake]);

  // A head tilt reads as "thinking"; reactions give a little hop.
  useEffect(() => {
    lean.set(withSpring(state === 'thinking' ? 1 : 0, { damping: 12, stiffness: 90 }));
    if (POP_STATES.includes(state)) {
      pop.set(withSequence(withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }), withSpring(0, { damping: 7, stiffness: 140 })));
    }
  }, [state, lean, pop]);

  // The capsule squashes a touch with each syllable, so the whole face talks and not just the mouth.
  const bodyStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(toneStep.get(), TONE_STEPS, RIM_COLORS),
    transform: [
      { translateX: shake.get() * width * 0.012 },
      { translateY: (float.get() - 0.5) * -drift.height - pop.get() * 9 },
      { rotate: `${lean.get() * 4 + (float.get() - 0.5) * 2 * drift.wobble + shake.get() * 1.5}deg` },
      { scaleX: 1 + pop.get() * 0.05 + mouth.get() * 0.02 },
      { scaleY: 1 + pop.get() * 0.05 - mouth.get() * 0.015 },
    ],
  }));

  // The soft coloured haze around the capsule, as on the reference.
  const haloStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity * (0.65 + glow.get() * 0.35),
      backgroundColor: interpolateColor(toneStep.get(), TONE_STEPS, GLOW_COLORS),
      transform: [{ scale: 1 + glow.get() * 0.04 }],
    };
  });

  const toneColor = RIMS[tone];

  return (
    <View
      style={[styles.frame, { width: width * 1.12, height: height * 1.75 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { width, height, borderRadius: height / 2, boxShadow: `0 0 ${height * 0.4}px ${height * 0.14}px ${GLOWS[tone]}` },
          haloStyle,
        ]}
      />
      <Animated.View style={[{ width, height, borderRadius: height / 2 }, bodyStyle]}>
        <View
          style={[
            styles.face,
            { top: rim, left: rim, right: rim, bottom: rim, borderRadius: (height - rim * 2) / 2 },
          ]}
        />
        <Features motion={motion} />
        <AngerMark active={angry} height={height} />
        <Sparkle active={tone === 'funny'} size={height * 0.3} delay={0} style={{ top: -height * 0.18, left: -height * 0.08 }} />
        <Sparkle active={tone === 'funny'} size={height * 0.22} delay={320} style={{ top: -height * 0.2, right: height * 0.2 }} />
        <ThinkingDots visible={state === 'thinking'} height={height} color={toneColor} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  face: { position: 'absolute', backgroundColor: '#FFFFFF' },
  badge: { position: 'absolute' },
  dots: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 6px 16px rgba(18, 88, 140, 0.22)',
  },
});
