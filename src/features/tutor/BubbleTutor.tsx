import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AIFace, type AIFaceProps, type FaceState } from '@/features/face';
import { colors } from '@/theme';
import { TUTOR_TONES, type TutorTone } from '@/types';

/** The frame leaves room around the ball for its glow. */
const FRAME = 1.24;

interface Skin {
  ball: readonly [string, string, string];
  rim: string;
  halo: string;
  glow: string;
  /** Inner shade at the bottom of the ball. */
  shade: string;
  drop: string;
  ink: string;
  eyeLight: string;
  mouth: string;
  blush: string;
  accent: string;
}

/** One colour scheme per tone, so the mood reads at a glance: sky blue, sunny yellow, boiling red. */
const SKINS: Record<TutorTone, Skin> = {
  calm: {
    ball: ['#FFFFFF', '#E3F3FE', '#B8DEF9'],
    rim: 'rgba(255, 255, 255, 0.95)',
    halo: 'rgba(170, 220, 255, 0.35)',
    glow: 'rgba(150, 210, 255, 0.85)',
    shade: 'rgba(42, 150, 230, 0.28)',
    drop: 'rgba(18, 88, 140, 0.25)',
    ink: '#1F2A48',
    eyeLight: colors.primaryLight,
    mouth: '#F0566A',
    blush: '#FF9DB0',
    accent: colors.primary,
  },
  funny: {
    ball: ['#FFFEF5', '#FFE27A', '#FFB020'],
    rim: 'rgba(255, 251, 232, 0.95)',
    halo: 'rgba(255, 214, 90, 0.38)',
    glow: 'rgba(255, 190, 60, 0.9)',
    shade: 'rgba(214, 120, 0, 0.32)',
    drop: 'rgba(150, 90, 0, 0.25)',
    ink: '#3D2306',
    eyeLight: '#9A6420',
    mouth: '#E8475A',
    blush: '#FF7A59',
    accent: '#F59E0B',
  },
  angry: {
    ball: ['#FFD6CE', '#FF6656', '#D11F17'],
    rim: 'rgba(255, 222, 216, 0.9)',
    halo: 'rgba(255, 80, 70, 0.4)',
    glow: 'rgba(255, 40, 30, 0.9)',
    shade: 'rgba(120, 0, 0, 0.4)',
    drop: 'rgba(120, 10, 10, 0.32)',
    ink: '#3B0709',
    eyeLight: '#7A1A1C',
    mouth: '#5E0B12',
    blush: '#B3121B',
    accent: '#E5302F',
  },
};

/** How the ball floats per tone: calm drifts, funny bounces, angry barely moves (it shakes instead). */
const FLOAT: Record<TutorTone, { period: number; height: number; wobble: number }> = {
  calm: { period: 2600, height: 8, wobble: 0 },
  funny: { period: 1300, height: 13, wobble: 3 },
  angry: { period: 1800, height: 4, wobble: 0 },
};

const GLOW: Record<FaceState, { opacity: number; period: number }> = {
  idle: { opacity: 0.45, period: 2800 },
  listening: { opacity: 0.95, period: 1100 },
  thinking: { opacity: 0.6, period: 1500 },
  speaking: { opacity: 0.8, period: 900 },
  happy: { opacity: 0.85, period: 1400 },
  encouraging: { opacity: 0.8, period: 1400 },
  wink: { opacity: 0.75, period: 1400 },
  surprised: { opacity: 0.95, period: 1000 },
};

const POP_STATES: readonly FaceState[] = ['happy', 'encouraging', 'wink', 'surprised'];

const ANGER_MARK = 'M9 3v3.5a2.5 2.5 0 0 1-2.5 2.5H3M15 3v3.5a2.5 2.5 0 0 0 2.5 2.5H21M9 21v-3.5a2.5 2.5 0 0 0-2.5-2.5H3M15 21v-3.5a2.5 2.5 0 0 1 2.5-2.5H21';
const SPARKLE = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z';

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

/** Three dots that pulse in sequence above the tutor's shoulder while it is thinking. */
function ThinkingDots({ visible, size, color }: { visible: boolean; size: number; color: string }) {
  const presence = useSharedValue(0);
  useEffect(() => {
    presence.set(withTiming(visible ? 1 : 0, { duration: 260 }));
  }, [visible, presence]);
  const style = useAnimatedStyle(() => ({ opacity: presence.get(), transform: [{ scale: 0.6 + presence.get() * 0.4 }] }));

  return (
    <Animated.View pointerEvents="none" style={[styles.dots, { top: -size * 0.05, right: -size * 0.1, gap: size * 0.025, padding: size * 0.04 }, style]}>
      {[0, 1, 2].map((index) => (
        <Dot key={index} index={index} active={visible} size={size * 0.04} color={color} />
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

/** The manga "popping vein" that throbs on the angry tutor's forehead. */
function AngerMark({ active, size }: { active: boolean; size: number }) {
  const { shown, beat } = usePulse(active, 420);
  const style = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ scale: shown.get() * (0.86 + beat.get() * 0.22) }] }));
  const box = size * 0.24;
  return (
    <Animated.View pointerEvents="none" style={[styles.badge, { width: box, height: box, top: -size * 0.02, right: -size * 0.02 }, style]}>
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

function SkinLayer({ skin, mix }: { skin: Skin; mix: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: mix.get() }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <LinearGradient colors={skin.ball} locations={[0, 0.5, 1]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function useToneMix(tone: TutorTone, own: TutorTone) {
  const mix = useSharedValue(tone === own ? 1 : 0);
  useEffect(() => {
    mix.set(withTiming(tone === own ? 1 : 0, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [tone, own, mix]);
  return mix;
}

/**
 * The default tutor: a glossy ball with a friendly face. Its colour and temperament follow the
 * conversation tone (blue and gentle, yellow and bouncy, red and fuming). Light enough to run on any
 * phone (plain views and a few small SVGs), and it reads well over every scenario photo.
 */
export const BubbleTutor = memo(function BubbleTutor({
  state,
  emotion = 'neutral',
  audioLevel,
  size = 180,
  tone = 'calm',
}: AIFaceProps & { size?: number; tone?: TutorTone }) {
  const float = useSharedValue(0);
  const glow = useSharedValue(0);
  const lean = useSharedValue(0);
  const pop = useSharedValue(0);
  const shake = useSharedValue(0);
  const mixes = { calm: useToneMix(tone, 'calm'), funny: useToneMix(tone, 'funny'), angry: useToneMix(tone, 'angry') };
  const skin = SKINS[tone];
  const motion = FLOAT[tone];
  const { opacity } = GLOW[state];
  const period = GLOW[state].period * (tone === 'angry' ? 0.6 : 1);
  const angry = tone === 'angry';
  const speaking = state === 'speaking';

  useEffect(() => {
    cancelAnimation(float);
    float.set(0);
    float.set(withRepeat(withTiming(1, { duration: motion.period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [float, motion.period]);

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

  const ballStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.get() * size * 0.018 },
      { translateY: (float.get() - 0.5) * -motion.height - pop.get() * 10 },
      { rotate: `${lean.get() * 5 + (float.get() - 0.5) * 2 * motion.wobble + shake.get() * 2}deg` },
      { scale: 1 + pop.get() * 0.05 },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: opacity * (0.6 + glow.get() * 0.4),
    transform: [{ scale: 1 + glow.get() * (angry ? 0.1 : 0.06) }],
  }));

  const frame = size * FRAME;
  const radius = size / 2;

  return (
    <View
      style={[styles.frame, { width: frame, height: frame }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { width: size, height: size, borderRadius: radius, backgroundColor: skin.halo, boxShadow: `0 0 ${size * 0.22}px ${size * 0.06}px ${skin.glow}` },
          haloStyle,
        ]}
      />
      {/* The drop shadow sits on the wrapper: the ball itself clips its colour layers to the circle. */}
      <Animated.View style={[{ width: size, height: size, borderRadius: radius, boxShadow: `0 ${size * 0.06}px ${size * 0.16}px ${skin.drop}` }, ballStyle]}>
        <View style={[styles.ball, { borderRadius: radius }]}>
          {TUTOR_TONES.map((option) => (
            <SkinLayer key={option} skin={SKINS[option]} mix={mixes[option]} />
          ))}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: radius, borderWidth: 2, borderColor: skin.rim, boxShadow: `inset 0 ${-size * 0.06}px ${size * 0.12}px ${skin.shade}` },
            ]}
          />
          <View style={[styles.gloss, { width: size * 0.36, height: size * 0.14, top: size * 0.1, left: size * 0.16 }]} />
          <AIFace
            state={state}
            emotion={emotion}
            audioLevel={audioLevel}
            size={size * 0.66}
            color={skin.ink}
            eyeLight={skin.eyeLight}
            mouthColor={skin.mouth}
            blush={skin.blush}
            mood={tone}
          />
        </View>
        <AngerMark active={angry} size={size} />
        <Sparkle active={tone === 'funny'} size={size * 0.14} delay={0} style={{ top: size * 0.02, left: -size * 0.04 }} />
        <Sparkle active={tone === 'funny'} size={size * 0.1} delay={320} style={{ top: size * 0.04, right: 0 }} />
        <ThinkingDots visible={state === 'thinking'} size={size} color={skin.accent} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  ball: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '6%',
    overflow: 'hidden',
  },
  badge: { position: 'absolute' },
  dots: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    boxShadow: '0 6px 16px rgba(18, 88, 140, 0.22)',
  },
  gloss: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.9)', transform: [{ rotate: '-18deg' }] },
});
