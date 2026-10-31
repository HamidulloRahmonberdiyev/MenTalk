import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

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
  /** Small label after the title, e.g. the CEFR band of a level. */
  tag?: string;
}

const SELECTED_EDGE = '#1A84BF';

/** A chunky answer card: it rests on a darker edge, sinks when pressed and turns blue when chosen. */
export function OptionCard({ emoji, title, description, selected, onPress, tile = false, multi = false, tag }: OptionCardProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      edgeColor={selected ? SELECTED_EDGE : home.rimBottom}
      depth={4}
      radius={radii.lg}
      style={tile && styles.tileOuter}
      faceStyle={[styles.card, tile ? styles.tile : styles.row, selected && styles.selected]}
    >
      <View style={[styles.emojiWrap, tile && styles.emojiWrapTile, selected && styles.emojiWrapSelected]}>
        <AppText style={tile ? styles.emojiTile : styles.emoji}>{emoji}</AppText>
      </View>
      <View style={tile ? styles.tileTexts : styles.texts}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" numberOfLines={tile ? 2 : 1} color={selected ? home.accent : home.text} style={tile && styles.tileTitle}>
            {title}
          </AppText>
          {tag ? (
            <View style={[styles.tag, selected && styles.tagSelected]}>
              <AppText variant="captionStrong" color={selected ? colors.onPrimary : home.textMuted}>
                {tag}
              </AppText>
            </View>
          ) : null}
        </View>
        {description ? (
          <AppText variant="caption" color={home.textSecondary} style={tile && styles.tileTitle}>
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.check, tile && styles.checkTile, multi && styles.checkMulti, selected && styles.checkOn]}>
        {selected ? <Ionicons name="checkmark" size={15} color={colors.onPrimary} /> : null}
      </View>
    </Pressable3D>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    tileOuter: { flex: 1 },
    tile: { flex: 1, alignItems: 'center', gap: spacing.sm, minHeight: 128, paddingTop: spacing.xl },
    selected: { borderColor: colors.primary, backgroundColor: home.selected },
    emojiWrap: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.primaryTint,
    },
    emojiWrapTile: { width: 56, height: 56, borderRadius: radii.lg },
    emojiWrapSelected: { backgroundColor: home.panel },
    emoji: { fontSize: 26, lineHeight: 32 },
    emojiTile: { fontSize: 30, lineHeight: 36 },
    texts: { flex: 1, gap: 2 },
    tileTexts: { gap: 2, alignItems: 'center' },
    tileTitle: { textAlign: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
    tag: { paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radii.pill, backgroundColor: home.track },
    tagSelected: { backgroundColor: colors.primary },
    check: {
      width: 24,
      height: 24,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: home.rim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkTile: { position: 'absolute', top: spacing.md, right: spacing.md },
    checkMulti: { borderRadius: 8 },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  });
