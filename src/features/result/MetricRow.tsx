import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { easing } from '@/theme/motion';
import { usePalette } from '@/theme/appearance';
import type { Metric } from '@/types';

import { METRIC_META } from './resultCopy';

/** One skill: a chunky icon chip, the score, and a thick glossy bar that fills in after the card lands. */
export function MetricRow({ metric, delay = 0 }: { metric: Metric; delay?: number }) {
  const t = useT();
  const home = usePalette();
  const { label: labelKey, icon, color, edge } = METRIC_META[metric.id];
  const label = t(labelKey);
  const share = metric.max > 0 ? Math.min(Math.max(metric.score / metric.max, 0), 1) : 0;

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.set(withDelay(delay, withTiming(share, { duration: 900, easing: easing.out })));
  }, [fill, share, delay]);
  // A short stub stays at 0, so an empty skill still reads as a bar.
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(fill.get(), 0.04) * 100}%` }));

  return (
    <View style={styles.row} accessible accessibilityLabel={t('result.outOf', { label, score: metric.score, max: metric.max })}>
      <View style={[styles.icon, { backgroundColor: color, borderBottomColor: edge }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.body}>
        <View style={styles.labels}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.label}>
            {label}
          </AppText>
          <AppText color={home.appearance === 'dark' ? color : edge} style={styles.score}>
            {metric.score}
            <AppText color={home.textMuted} style={styles.max}>
              /{metric.max}
            </AppText>
          </AppText>
        </View>
        <View style={[styles.track, { backgroundColor: home.rim }]}>
          <Animated.View style={[styles.fill, { backgroundColor: color }, bar]}>
            <View style={styles.gloss} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
  },
  body: { flex: 1, gap: spacing.sm },
  labels: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  label: { flexShrink: 1 },
  score: { fontSize: 17, lineHeight: 22, fontWeight: '900' },
  max: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  track: { height: 14, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  // The light streak along the top of a Duolingo bar.
  gloss: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
