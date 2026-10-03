import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radii } from '@/theme';

interface ProgressSegmentsProps {
  count: number;
  /** Zero-based index of the current step. */
  step: number;
}

/** One pill per step; each fills from the left when reached. */
export function ProgressSegments({ count, step }: ProgressSegmentsProps) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: count, now: step + 1 }}>
      {Array.from({ length: count }, (_, index) => (
        <Segment key={index} filled={index <= step} />
      ))}
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const progress = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(filled ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [filled, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 6 },
  track: { flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.primary },
});
