import { Ionicons } from '@expo/vector-icons';
import { Children, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { IconName } from '@/types';

const ICON = 38;

interface SettingsRowProps {
  icon: IconName;
  tint: string;
  label: string;
  /** Current value, shown muted before the chevron. */
  value?: string;
  destructive?: boolean;
  onPress: () => void;
}

export function SettingsRow({ icon, tint, label, value, destructive = false, onPress }: SettingsRowProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      scaleTo={0.98}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={styles.row}
    >
      <IconTile icon={icon} tint={tint} size={ICON} />
      <AppText variant="bodyStrong" color={destructive ? colors.danger : colors.text} style={styles.label} numberOfLines={1}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {destructive ? null : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </PressableScale>
  );
}

/** Rounded card that stacks rows with hairlines between them, like a native settings group. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <View style={styles.group}>
      {Children.toArray(children).map((row, index) => (
        <View key={isValidElement(row) ? row.key : index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  label: { flex: 1 },
  group: { borderRadius: radii.lg, backgroundColor: colors.surface, overflow: 'hidden', ...shadows.card },
  // Starts under the label, past the icon, as native grouped lists do.
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + ICON + spacing.md, backgroundColor: colors.border },
});
