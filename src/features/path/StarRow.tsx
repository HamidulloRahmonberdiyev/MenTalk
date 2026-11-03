import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { usePalette } from '@/theme/appearance';

import { GOLD } from './color';

interface StarRowProps {
  /** 0–3 earned. */
  count: number;
  size?: number;
  gap?: number;
  /** Colour of the stars not yet earned; defaults to the theme's quiet rim. */
  emptyColor?: string;
}

/** Three stars, the earned ones gold; the middle one sits a little higher, like a podium. */
export function StarRow({ count, size = 18, gap = 4, emptyColor }: StarRowProps) {
  const home = usePalette();
  return (
    <View style={[styles.row, { gap }]}>
      {[0, 1, 2].map((index) => (
        <Ionicons
          key={index}
          name="star"
          size={index === 1 ? size + 3 : size}
          color={index < count ? GOLD : (emptyColor ?? home.rimBottom)}
          style={index === 1 ? { marginTop: -size * 0.35 } : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
