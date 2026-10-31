import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { IconName } from '@/types';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface ActionButtonProps {
  icon: IconName;
  label: string;
  active?: boolean;
  /** Spoken label when it differs from the visible one. */
  accessibilityLabel?: string;
  onPress: () => void;
}

/** Small secondary action under the mic (keyboard, hint). */
export function ActionButton({ icon, label, active = false, accessibilityLabel, onPress }: ActionButtonProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={styles.root}
    >
      <View style={[styles.circle, active && styles.circleActive]}>
        <Ionicons name={icon} size={24} color={active ? colors.onPrimary : colors.primary} />
      </View>
      <AppText variant="caption" color={home.textSecondary}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 76,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: home.panel,
    ...shadows.card,
  },
  circleActive: {
    backgroundColor: colors.primary,
  },
});
