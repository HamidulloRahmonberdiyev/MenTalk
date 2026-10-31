import { StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface ChipProps {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Checkbox semantics for multi-select groups. */
  multi?: boolean;
}

/** A chunky dark option that presses down; the chosen one turns blue, as in Duolingo's pickers. */
export function Chip({ emoji, label, selected, onPress, multi = false }: ChipProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      edgeColor={selected ? '#1A84BF' : home.rimBottom}
      depth={4}
      radius={radii.md}
      faceStyle={[styles.chip, selected && styles.selected]}
    >
      <AppText style={styles.emoji}>{emoji}</AppText>
      <AppText variant="bodyStrong" color={selected ? home.accent : home.text} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable3D>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderWidth: 2,
    borderColor: home.rim,
    backgroundColor: home.track,
  },
  selected: { borderColor: colors.primary, backgroundColor: home.selected },
  emoji: { fontSize: 20, lineHeight: 24 },
});
