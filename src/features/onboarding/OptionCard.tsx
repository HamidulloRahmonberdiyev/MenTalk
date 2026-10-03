import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';

interface OptionCardProps {
  emoji: string;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Square tile for 2-column grids instead of a full-width row. */
  tile?: boolean;
  /** Rounded check (multi-select) instead of a radio dot. */
  multi?: boolean;
}

export function OptionCard({ emoji, title, description, selected, onPress, tile = false, multi = false }: OptionCardProps) {
  return (
    <PressableScale
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={[styles.card, tile ? styles.tile : styles.row, selected && styles.selected]}
    >
      <View style={[styles.emojiWrap, selected && styles.emojiWrapSelected]}>
        <AppText style={styles.emoji}>{emoji}</AppText>
      </View>
      <View style={tile ? styles.tileTexts : styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.check, tile && styles.checkTile, multi && styles.checkMulti, selected && styles.checkOn]}>
        {selected ? <Ionicons name="checkmark" size={15} color={colors.onPrimary} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tile: { flex: 1, alignItems: 'flex-start', gap: spacing.md, minHeight: 124 },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  emojiWrapSelected: { backgroundColor: colors.surface },
  emoji: { fontSize: 26, lineHeight: 32 },
  texts: { flex: 1, gap: 2 },
  tileTexts: { gap: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTile: { position: 'absolute', top: spacing.md, right: spacing.md },
  checkMulti: { borderRadius: 8 },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
