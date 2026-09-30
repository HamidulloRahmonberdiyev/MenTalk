import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { colors, spacing } from '@/theme';
import type { IconName } from '@/types';

interface StatTileProps {
  icon: IconName;
  tint: string;
  value: string;
  label: string;
}

export function StatTile({ icon, tint, value, label }: StatTileProps) {
  return (
    <Card style={styles.tile}>
      <IconTile icon={icon} tint={tint} size={40} />
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
        {label}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
});
