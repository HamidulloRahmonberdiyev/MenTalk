import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radii } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: string;
  trackColor?: string;
}

export function ProgressBar({ value, color = colors.primary, trackColor: track }: ProgressBarProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const trackColor = track ?? home.rim;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(Math.max(value, 0), 1), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: home.rim,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
