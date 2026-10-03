import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors, radii, spacing } from '@/theme';

/** Pulsing placeholder shown while the first translation loads. */
export function ResultSkeleton() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.4 }));

  return (
    <Animated.View style={[styles.card, style]} accessibilityRole="progressbar">
      <View style={[styles.line, styles.short]} />
      <View style={styles.line} />
      <View style={[styles.line, styles.medium]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.xl, borderRadius: radii.xl, backgroundColor: colors.surface },
  line: { height: 18, borderRadius: radii.sm, backgroundColor: colors.primarySoft },
  short: { width: '35%', height: 12 },
  medium: { width: '70%' },
});
