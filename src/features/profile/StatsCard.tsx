import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { radii, spacing } from '@/theme';
import type { IconName } from '@/types';

import { home } from '../home/homeTheme';

export interface Stat {
  icon: IconName;
  tint: string;
  value: string;
  label: string;
}

/** Three tiles to a row, each outlined with a chunky bottom edge. */
export function StatsCard({ stats }: { stats: readonly Stat[] }) {
  return (
    <View style={styles.grid}>
      {stats.map(({ icon, tint, value, label }) => (
        <View key={label} style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
          <Ionicons name={icon} size={26} color={tint} />
          <AppText variant="heading" color={home.text} numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
            {value}
          </AppText>
          <AppText variant="caption" color={home.textMuted} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    gap: 2,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: home.rim,
    backgroundColor: home.panel,
  },
  value: { marginTop: spacing.xs, fontWeight: '800' },
});
