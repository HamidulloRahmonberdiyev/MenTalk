import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radii, shadows } from '@/theme';
import type { IconName, VoiceState } from '@/types';

const CORE = 88;
const STAGE = 148;

const ICONS: Record<VoiceState, IconName> = {
  idle: 'mic',
  listening: 'mic',
  thinking: 'ellipsis-horizontal',
  speaking: 'mic',
};

interface VoiceOrbProps {
  state: VoiceState;
  onPress: () => void;
  accessibilityLabel: string;
  /** Live microphone loudness (0..1); the inner halo swells with the user's voice while listening. */
  level?: SharedValue<number>;
}

/** Mic button: a still core with two soft halo rings that breathe (idle) or ripple outwards (listening). */
export const VoiceOrb = memo(function VoiceOrb({ state, onPress, accessibilityLabel, level }: VoiceOrbProps) {
  const phase = useSharedValue(0);
  const listening = state === 'listening';

  useEffect(() => {
    cancelAnimation(phase);
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: listening ? 1300 : 2600, easing: listening ? Easing.out(Easing.quad) : Easing.inOut(Easing.sin) }),
      -1,
      !listening,
    );
  }, [listening, phase]);

  const outer = useAnimatedStyle(() => ({
    opacity: listening ? 0.5 * (1 - phase.value) : 0.55,
    transform: [{ scale: listening ? 1 + phase.value * 0.3 : 1 + phase.value * 0.04 }],
  }));
  // A second ripple half a cycle behind the first, so listening reads as continuous sound waves.
  const outerTrail = useAnimatedStyle(() => {
    const p = (phase.value + 0.5) % 1;
    return { opacity: listening ? 0.4 * (1 - p) : 0, transform: [{ scale: 1 + p * 0.3 }] };
  });
  const inner = useAnimatedStyle(() => ({
    transform: [{ scale: listening && level ? 1 + level.value * 0.16 : 1 + phase.value * 0.03 }],
  }));

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.outer, outer]} />
      <Animated.View style={[styles.outer, outerTrail]} />
      <Animated.View style={[styles.inner, inner]} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={state === 'thinking'}
        scaleTo={0.94}
        onPress={onPress}
        style={styles.core}
      >
        <LinearGradient
          colors={[colors.primaryLight, colors.primaryDark]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.fill}
        >
          <Ionicons name={ICONS[state]} size={38} color={colors.onPrimary} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  outer: {
    position: 'absolute',
    width: STAGE,
    height: STAGE,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(42, 171, 238, 0.14)',
  },
  inner: {
    position: 'absolute',
    width: CORE + 28,
    height: CORE + 28,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(42, 171, 238, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  core: { width: CORE, height: CORE, borderRadius: radii.pill, ...shadows.primary },
  fill: { flex: 1, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
