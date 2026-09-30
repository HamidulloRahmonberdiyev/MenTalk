import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { IconName } from '@/types';

interface ActionButtonProps {
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}

/** Small secondary action under the mic (keyboard, hint). */
export function ActionButton({ icon, label, active = false, onPress }: ActionButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  circleActive: {
    backgroundColor: colors.primary,
  },
});
