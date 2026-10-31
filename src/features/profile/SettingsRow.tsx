import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/types';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';


const ICON = 40;

interface SettingsRowProps {
  icon: IconName;
  tint: string;
  label: string;
  /** Current value, shown muted before the chevron. */
  value?: string;
  destructive?: boolean;
  onPress: () => void;
}

/** A chunky dark button: solid icon tile, label, and a face that presses down onto its edge. */
export function SettingsRow({ icon, tint, label, value, destructive = false, onPress }: SettingsRowProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={destructive ? home.dangerEdge : home.rimBottom}
      depth={4}
      radius={radii.lg}
      faceStyle={[styles.row, destructive && styles.destructive]}
    >
      <View style={[styles.icon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={22} color="#FFFFFF" />
      </View>
      <AppText variant="bodyStrong" color={destructive ? colors.danger : home.text} style={styles.label} numberOfLines={1}>
        {label}
      </AppText>
      {value ? (
        <AppText variant="captionStrong" color={home.textMuted} numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {destructive ? null : <Ionicons name="chevron-forward" size={20} color={home.textMuted} />}
    </Pressable3D>
  );
}

/** Stacks rows with a little air between them, each its own button. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.group}>{children}</View>;
}

const createStyles = (home: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: home.rim,
    backgroundColor: home.panel,
  },
  destructive: { borderColor: home.dangerRim, backgroundColor: home.dangerFill },
  icon: { width: ICON, height: ICON, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
  group: { gap: spacing.md },
});
