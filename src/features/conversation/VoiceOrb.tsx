import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii } from '@/theme';
import type { IconName, VoiceState } from '@/types';

const STAGE = 190;
const ORB = 108;
const PERSPECTIVE = 520;

interface StateMotion {
  spinMs: number;
  pulse: number;
  pulseMs: number;
}

const MOTION: Record<VoiceState, StateMotion> = {
  idle: { spinMs: 9000, pulse: 0.04, pulseMs: 2200 },
  listening: { spinMs: 3600, pulse: 0.1, pulseMs: 640 },
  thinking: { spinMs: 1500, pulse: 0.03, pulseMs: 1100 },
  speaking: { spinMs: 4800, pulse: 0.07, pulseMs: 520 },
};

const ICONS: Record<VoiceState, IconName> = {
  idle: 'mic',
  listening: 'mic',
  thinking: 'ellipsis-horizontal',
  speaking: 'volume-high',
};

interface RingSpec {
  tiltX: number;
  tiltY: number;
  direction: 1 | -1;
  phase: number;
}

const RINGS: readonly RingSpec[] = [
  { tiltX: 72, tiltY: 0, direction: 1, phase: 0 },
  { tiltX: 72, tiltY: 48, direction: -1, phase: 120 },
  { tiltX: 72, tiltY: -48, direction: 1, phase: 240 },
];

interface VoiceOrbProps {
  state: VoiceState;
  onPress: () => void;
  accessibilityLabel: string;
}

export const VoiceOrb = memo(function VoiceOrb({ state, onPress, accessibilityLabel }: VoiceOrbProps) {
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const { spinMs, pulseMs } = MOTION[state];
    cancelAnimation(spin);
    cancelAnimation(pulse);
    spin.value = withRepeat(withTiming(spin.value + 360, { duration: spinMs, easing: Easing.linear }), -1);
    pulse.value = withRepeat(withTiming(1, { duration: pulseMs / 2, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [state, spin, pulse]);

  const { pulse: amplitude } = MOTION[state];

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { translateY: -pulse.value * 8 },
      { rotateY: `${Math.sin((spin.value * Math.PI) / 180) * 14}deg` },
      { rotateX: `${Math.cos((spin.value * Math.PI) / 180) * 8}deg` },
      { scale: 1 + pulse.value * amplitude },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * amplitude * 4 }],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.32 - pulse.value * 0.14,
    transform: [{ scaleX: 1 - pulse.value * 0.22 }],
  }));

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[styles.groundShadow, shadowStyle]} />

      <Rings spin={spin} />

      <Animated.View style={[styles.orbWrap, orbStyle]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          disabled={state === 'thinking'}
          scaleTo={0.94}
          onPress={onPress}
          style={styles.orb}
        >
          <Sphere />
          <Ionicons name={ICONS[state]} size={42} color={colors.onPrimary} style={styles.icon} />
        </PressableScale>
      </Animated.View>

      <Rings spin={spin} front />
    </View>
  );
});

function Sphere() {
  return (
    <Svg width={ORB} height={ORB} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="orbBody" cx="36%" cy="28%" r="78%" fx="36%" fy="28%">
          <Stop offset="0" stopColor="#9CCBFF" />
          <Stop offset="0.42" stopColor={colors.primary} />
          <Stop offset="1" stopColor="#0A38A0" />
        </RadialGradient>
        <RadialGradient id="orbRim" cx="50%" cy="50%" r="50%">
          <Stop offset="0.72" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="1" stopColor="#7FB6FF" stopOpacity="0.55" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill="url(#orbBody)" />
      <Circle cx="50" cy="50" r="50" fill="url(#orbRim)" />
      <Ellipse cx="35" cy="21" rx="20" ry="10" fill="#FFFFFF" opacity={0.42} transform="rotate(-24 35 21)" />
      <Ellipse cx="66" cy="84" rx="18" ry="6" fill="#5AA2FF" opacity={0.35} />
    </Svg>
  );
}

function Rings({ spin, front = false }: { spin: SharedValue<number>; front?: boolean }) {
  const rings = RINGS.map((spec, index) => <OrbitRing key={index} spin={spin} spec={spec} />);

  if (!front) return <View style={styles.layer}>{rings}</View>;

  return (
    <View style={styles.frontClip} pointerEvents="none">
      <View style={styles.frontInner}>{rings}</View>
    </View>
  );
}

function OrbitRing({ spin, spec }: { spin: SharedValue<number>; spec: RingSpec }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${spec.tiltX}deg` },
      { rotateY: `${spec.tiltY}deg` },
      { rotateZ: `${spin.value * spec.direction + spec.phase}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.ring, style]}>
      <View style={styles.dot} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: ORB,
    height: ORB,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(31, 122, 255, 0.28)',
    boxShadow: '0 0 60px rgba(31, 122, 255, 0.55)',
  },
  groundShadow: {
    position: 'absolute',
    bottom: 2,
    width: ORB * 0.85,
    height: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(10, 56, 160, 0.5)',
    boxShadow: '0 0 18px rgba(10, 56, 160, 0.5)',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frontClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: STAGE / 2,
    overflow: 'hidden',
  },
  frontInner: {
    position: 'absolute',
    top: -STAGE / 2,
    left: 0,
    width: STAGE,
    height: STAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrap: {
    width: ORB,
    height: ORB,
    borderRadius: radii.pill,
    boxShadow: '0 18px 36px rgba(10, 56, 160, 0.4)',
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textShadowColor: 'rgba(5, 30, 110, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  ring: {
    position: 'absolute',
    width: STAGE - 8,
    height: STAGE - 8,
    borderRadius: radii.pill,
    borderWidth: 2.5,
    borderColor: 'rgba(31, 122, 255, 0.45)',
  },
  dot: {
    position: 'absolute',
    top: -6,
    left: (STAGE - 8) / 2 - 6,
    width: 12,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    boxShadow: '0 0 12px rgba(31, 122, 255, 0.9)',
  },
});
