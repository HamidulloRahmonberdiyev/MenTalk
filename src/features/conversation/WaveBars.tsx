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

const PROFILE = [0.35, 0.65, 1, 0.7, 0.4] as const;
const MAX = 52;
const MIN = 8;

interface WaveBarsProps {
  active: boolean;
  /** Reverse the profile so two sets flank the mic symmetrically. */
  mirrored?: boolean;
}

export const WaveBars = memo(function WaveBars({ active, mirrored = false }: WaveBarsProps) {
  const profile = mirrored ? [...PROFILE].reverse() : PROFILE;
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {profile.map((amplitude, index) => (
        <Bar key={index} amplitude={amplitude} index={index} active={active} />
      ))}
    </View>
  );
});

function Bar({ amplitude, index, active }: { amplitude: number; index: number; active: boolean }) {
  const height = useSharedValue(MIN + amplitude * 14);

  useEffect(() => {
    cancelAnimation(height);
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
  }, [active, amplitude, index, height]);

  const style = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[styles.bar, { opacity: 0.35 + amplitude * 0.5 }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, height: MAX },
  bar: { width: 4, borderRadius: radii.pill, backgroundColor: colors.primary },
});
