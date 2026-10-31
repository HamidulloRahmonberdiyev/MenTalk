import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { IconName } from '@/types';

export interface Shortcut {
  key: string;
  label: string;
  icon: IconName;
  /** The tile's own colour: a soft fill, a deeper edge, and the icon in full strength. */
  tint: string;
  onPress: () => void;
}

const TILE = 62;
const RADIUS = 20;

function ShortcutTile({ label, icon, tint, onPress }: Omit<Shortcut, 'key'>) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const dark = home.appearance === 'dark';

  return (
    <View style={styles.item}>
      <Pressable3D
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          haptics.light();
          onPress();
        }}
        // Hex alpha suffixes: the fill and edge are the tint at low strength over the sheet.
        edgeColor={`${tint}${dark ? '55' : '40'}`}
        depth={4}
        radius={RADIUS}
        style={styles.tile}
        faceStyle={[styles.face, { borderColor: `${tint}${dark ? '40' : '33'}` }]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${tint}${dark ? '2E' : '1F'}` }]} />
        <Ionicons name={icon} size={28} color={tint} />
      </Pressable3D>
      <AppText variant="captionStrong" color={home.text} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

export function ShortcutGrid({ items }: { items: Shortcut[] }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.grid}>
      {items.map(({ key, ...item }) => (
        <ShortcutTile key={key} {...item} />
      ))}
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.lg,
    },
    item: {
      width: '25%',
      alignItems: 'center',
      gap: spacing.sm,
    },
    tile: { width: TILE, height: TILE + 4 },
    face: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      // Opaque base under the translucent tint, so the edge behind the face never shows through.
      backgroundColor: home.panel,
    },
    label: {
      paddingHorizontal: 2,
      fontSize: 12,
    },
  });
