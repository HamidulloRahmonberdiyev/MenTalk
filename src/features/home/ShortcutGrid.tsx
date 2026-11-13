import { Image, type ImageSource } from 'expo-image';
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
  /** A 3D object on a transparent background; when set it replaces the vector illustration. */
  image?: ImageSource | number;
  onPress: () => void;
}

const TILE = 54;
const TILE_RADIUS = 18;
/** The darker lip under the tile, so it reads as a raised key like the big home cards. */
const DEPTH = 4;
/** The vector illustrations spill over the tile's top-right corner. */
const ART = 64;
/** The 3D objects float on a soft glow with a contact shadow, like the art on the big home cards. */
const OBJECT = 66;
const POP = 12;

const GLOW_THEME = {
  light: { halo: 'rgba(80, 150, 240, 0.22)', floor: 'rgba(20, 60, 140, 0.22)' },
  dark: { halo: 'rgba(110, 165, 255, 0.2)', floor: 'rgba(0, 0, 0, 0.5)' },
} as const;

/**
 * Per look: the tile face (lighter at the top), its lip, a hairline highlight along the top edge and
 * the drop shadow. Light is a soft sky tint on the white sheet; dark is a slate tile on the grey one.
 */
const TILE_THEME = {
  light: {
    face: ['#EEF5FF', '#D5E6FB'],
    lip: '#B9D1F1',
    rim: 'rgba(255, 255, 255, 1)',
    shadow: '0 7px 14px rgba(42, 110, 200, 0.2)',
  },
  // A blue-tinted night tile, so the blue objects belong to it and it still lifts off the grey sheet.
  dark: {
    face: ['#43507A', '#323C5E'],
    lip: '#252C45',
    rim: 'rgba(150, 180, 255, 0.25)',
    shadow: '0 7px 16px rgba(0, 0, 0, 0.45)',
  },
} as const;

function ShortcutTile({ label, art, image, onPress }: Omit<Shortcut, 'key'>) {
  const home = usePalette();
  const themed = useThemedStyles(createStyles);
  const tone = TILE_THEME[home.appearance];

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
      {image ? (
        <View style={styles.area} pointerEvents="none">
          <View style={themed.halo} />
          <View style={themed.floor} />
          <Image source={image} style={styles.object} contentFit="contain" transition={150} />
        </View>
      ) : (
        // Vector fallback (e.g. the random topic) keeps the slate tile with the art spilling over it.
        <View style={styles.area} pointerEvents="none">
          <View style={[themed.tileBox, styles.tileBoxShifted]}>
            <View style={themed.lip} />
            <LinearGradient colors={tone.face} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={themed.face} />
          </View>
          <View style={styles.art}>
            <ShortcutArt name={art} size={ART} />
          </View>
        </View>
      )}
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
  // Room for the tile plus the artwork rising out of it.
  area: {
    width: TILE + 20,
    height: TILE + DEPTH + POP,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  tileBoxShifted: { marginRight: 10 },
  art: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  object: {
    position: 'absolute',
    bottom: 2,
    width: OBJECT,
    height: OBJECT,
  },
});

const createStyles = (home: Palette) => {
  const tone = TILE_THEME[home.appearance];
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: spacing.md,
    },
    item: {
      width: '25%',
      alignItems: 'center',
      gap: 6,
    },
    halo: {
      position: 'absolute',
      top: 10,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: GLOW_THEME[home.appearance].halo,
      boxShadow: `0 0 22px 12px ${GLOW_THEME[home.appearance].halo}`,
    },
    floor: {
      position: 'absolute',
      bottom: 2,
      width: 40,
      height: 6,
      borderRadius: 3,
      backgroundColor: GLOW_THEME[home.appearance].floor,
      boxShadow: `0 0 8px 3px ${GLOW_THEME[home.appearance].floor}`,
    },
    tileBox: {
      width: TILE,
      height: TILE + DEPTH,
      borderRadius: TILE_RADIUS,
      boxShadow: tone.shadow,
    },
    lip: {
      position: 'absolute',
      top: DEPTH,
      left: 0,
      width: TILE,
      height: TILE,
      borderRadius: TILE_RADIUS,
      backgroundColor: tone.lip,
    },
    face: {
      width: TILE,
      height: TILE,
      borderRadius: TILE_RADIUS,
      borderWidth: 1,
      borderColor: tone.rim,
    },
    label: {
      paddingHorizontal: 2,
      fontSize: 12,
    },
  });
};
