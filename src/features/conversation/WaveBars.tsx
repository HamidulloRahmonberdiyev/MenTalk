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
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, radii } from '@/theme';

const PROFILE = [0.35, 0.65, 1, 0.7, 0.4] as const;
const MAX = 52;
const MIN = 8;

interface WaveBarsProps {
  active: boolean;
  /** Reverse the profile so two sets flank the mic symmetrically. */
  mirrored?: boolean;
  /** Live loudness 0..1. When given, the bars follow the voice instead of a canned loop. */
  level?: SharedValue<number>;
}

export const WaveBars = memo(function WaveBars({ active, mirrored = false, level }: WaveBarsProps) {
  const profile = mirrored ? [...PROFILE].reverse() : PROFILE;
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {profile.map((amplitude, index) => (
        <Bar key={index} amplitude={amplitude} index={index} active={active} level={level} />
      ))}
    </View>
  );
});

interface BarProps {
  amplitude: number;
  index: number;
  active: boolean;
  level?: SharedValue<number>;
}

function Bar({ amplitude, index, active, level }: BarProps) {
  const height = useSharedValue(MIN + amplitude * 14);
  const live = useSharedValue(0);
  const followsVoice = active && level !== undefined;

  useEffect(() => {
    live.value = withTiming(followsVoice ? 1 : 0, { duration: 200 });
  }, [followsVoice, live]);

  useEffect(() => {
    cancelAnimation(height);
    if (followsVoice) return;
    if (active) {
      const peak = MIN + (MAX - MIN) * amplitude;
      const duration = 300 + index * 55;
      height.value = withDelay(
        index * 60,
        withRepeat(
          withSequence(
            withTiming(peak, { duration, easing: Easing.inOut(Easing.quad) }),
            withTiming(MIN + 6, { duration, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        ),
      );
    } else {
      height.value = withTiming(MIN + amplitude * 14, { duration: 300 });
    }
  }, [active, followsVoice, amplitude, index, height]);

  const style = useAnimatedStyle(() => {
    if (live.value === 0 || !level) return { height: height.value };
    // Each bar reacts a little differently so the row ripples instead of pumping in unison.
    const wobble = 0.75 + 0.25 * Math.sin(Date.now() / (90 + index * 23) + index);
    const voiced = MIN + (MAX - MIN) * amplitude * Math.min(1, level.value * 1.5) * wobble;
    return { height: height.value + (voiced - height.value) * live.value };
  });
  return <Animated.View style={[styles.bar, { opacity: 0.35 + amplitude * 0.5 }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, height: MAX },
  bar: { width: 4, borderRadius: radii.pill, backgroundColor: colors.primary },
});
