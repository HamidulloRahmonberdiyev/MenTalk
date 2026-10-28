import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconTile } from '@/components/ui/IconTile';
import { colors, radii, shadows, spacing } from '@/theme';
import type { IconName } from '@/types';

export interface Stat {
  icon: IconName;
  tint: string;
  value: string;
  label: string;
}

/** One card, equal columns split by hairlines. */
export function StatsCard({ stats }: { stats: readonly Stat[] }) {
  return (
    <View style={styles.card}>
      {stats.map(({ icon, tint, value, label }, index) => (
        <View key={label} style={[styles.column, index > 0 && styles.divider]} accessible accessibilityLabel={`${label}: ${value}`}>
          <IconTile icon={icon} tint={tint} size={40} />
          <AppText variant="heading">{value}</AppText>
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  column: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  divider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
});
