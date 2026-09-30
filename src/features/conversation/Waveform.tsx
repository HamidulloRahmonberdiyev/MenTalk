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
} from 'react-native-reanimated';

import { colors, radii } from '@/theme';

const PROFILE = [0.4, 0.75, 1, 0.65, 0.35] as const;
const MAX_HEIGHT = 54;
const MIN_HEIGHT = 8;

interface WaveformProps {
  active: boolean;
  /** Mirror the profile so two waveforms flank the mic symmetrically. */
  mirrored?: boolean;
}

export const Waveform = memo(function Waveform({ active, mirrored = false }: WaveformProps) {
  const profile = mirrored ? [...PROFILE].reverse() : PROFILE;
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {profile.map((amplitude, index) => (
        <Bar key={index} amplitude={amplitude} index={index} active={active} />
      ))}
    </View>
  );
});

interface BarProps {
  amplitude: number;
  index: number;
  active: boolean;
}

function Bar({ amplitude, index, active }: BarProps) {
  const height = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    cancelAnimation(height);
    if (active) {
      const peak = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * amplitude;
      const duration = 320 + index * 55;
      height.value = withDelay(
        index * 60,
        withRepeat(
          withSequence(
            withTiming(peak, { duration, easing: Easing.inOut(Easing.quad) }),
            withTiming(MIN_HEIGHT + 4, { duration, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        ),
      );
    } else {
      height.value = withTiming(MIN_HEIGHT + amplitude * 10, { duration: 300 });
    }
  }, [active, amplitude, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));

  return <Animated.View style={[styles.bar, { opacity: 0.35 + amplitude * 0.5 }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: MAX_HEIGHT,
    width: 5 * 4 + 4 * 6,
  },
  bar: {
    width: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
});
