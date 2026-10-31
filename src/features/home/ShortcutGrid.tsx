import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { ShortcutArt, type ShortcutArtName } from './ShortcutArt';

export interface Shortcut {
  key: string;
  label: string;
  art: ShortcutArtName;
  onPress: () => void;
}

const TILE = 62;
const ART = 74;
/** Slate tile, a touch lighter at the top, like a recessed slot the illustration sits in. */
const TILE_COLORS = {
  dark: ['#46516E', '#353E57'],
  light: ['#E6EFFA', '#D2E1F4'],
} as const;

function ShortcutTile({ label, art, onPress }: Omit<Shortcut, 'key'>) {
  const home = usePalette();
  const themed = useThemedStyles(createStyles);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.92}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={themed.item}
    >
      <View style={themed.tileArea}>
        <LinearGradient colors={TILE_COLORS[home.appearance]} style={themed.tile} />
        {/* The illustration is bigger than its tile and spills over the top-right corner, as in Englify. */}
        <View style={styles.art} pointerEvents="none">
          <ShortcutArt name={art} size={ART} />
        </View>
      </View>
      <AppText variant="captionStrong" color={home.text} numberOfLines={1} style={themed.label}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export function ShortcutGrid({ items }: { items: Shortcut[] }) {
  const themed = useThemedStyles(createStyles);
  return (
    <View style={themed.grid}>
      {items.map(({ key, ...item }) => (
        <ShortcutTile key={key} {...item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  art: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
});

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
    tileArea: {
      width: TILE + 22,
      height: TILE + 16,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    tile: {
      width: TILE,
      height: TILE,
      marginRight: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: home.appearance === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(47, 119, 225, 0.12)',
    },
    label: {
      paddingHorizontal: 2,
      fontSize: 12,
    },
  });
