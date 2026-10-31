import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { radii, spacing } from '@/theme';

import { home } from './homeTheme';

export interface SkillBar {
  key: string;
  label: string;
  /** Shown above the fill, e.g. "3/5". */
  value: string;
  /** 0..1 */
  progress: number;
}

const BAR_HEIGHT = 128;

function Bar({ bar, index }: { bar: SkillBar; index: number }) {
  const fill = useSharedValue(0);
  const target = Math.min(Math.max(bar.progress, 0), 1);

  useEffect(() => {
    fill.set(withDelay(index * 70, withTiming(target, { duration: 700 })));
  }, [fill, index, target]);

  const fillStyle = useAnimatedStyle(() => ({ height: `${fill.get() * 100}%` }));

  return (
    <View style={styles.column} accessible accessibilityLabel={`${bar.label}: ${bar.value}`}>
      <View style={styles.track}>
        <AppText color={home.textMuted} style={styles.value}>
          {bar.value}
        </AppText>
        <Animated.View style={[styles.fill, fillStyle]}>
          <LinearGradient colors={['#6FC3F5', '#2A7FD4']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      <AppText color={home.text} numberOfLines={1} adjustsFontSizeToFit style={styles.label}>
        {bar.label.toUpperCase()}
      </AppText>
    </View>
  );
}

/** Englify-style column chart of the learner's progress numbers. */
export function SkillBars({ bars }: { bars: SkillBar[] }) {
  return (
    <View style={styles.panel}>
      {bars.map((bar, index) => (
        <Bar key={bar.key} bar={bar} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: home.panel,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
  },
  track: {
    width: '78%',
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: home.track,
  },
  value: {
    position: 'absolute',
    top: spacing.sm,
    left: 0,
    right: 0,
    zIndex: 1,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  fill: {
    width: '100%',
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
