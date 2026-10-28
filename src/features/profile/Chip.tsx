import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';

interface ChipProps {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Checkbox semantics for multi-select groups. */
  multi?: boolean;
}

export function Chip({ emoji, label, selected, onPress, multi = false }: ChipProps) {
  return (
    <PressableScale
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[styles.chip, selected && styles.selected]}
    >
      <AppText style={styles.emoji}>{emoji}</AppText>
      <AppText variant="captionStrong" color={selected ? colors.primaryDark : colors.text} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  emoji: { fontSize: 18, lineHeight: 22 },
});
