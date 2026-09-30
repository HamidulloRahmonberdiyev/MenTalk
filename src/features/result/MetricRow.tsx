import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import type { Metric } from '@/types';

import { METRIC_META } from './resultCopy';

export function MetricRow({ metric }: { metric: Metric }) {
  const t = useT();
  const { label: labelKey, icon, color } = METRIC_META[metric.id];
  const label = t(labelKey);

  return (
    <View style={styles.row} accessible accessibilityLabel={t('result.outOf', { label, score: metric.score, max: metric.max })}>
      <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.body}>
        <View style={styles.labels}>
          <AppText variant="bodyStrong">{label}</AppText>
          <AppText variant="bodyStrong">
            {metric.score}/{metric.max}
          </AppText>
        </View>
        <ProgressBar value={metric.score / metric.max} color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.sm,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
