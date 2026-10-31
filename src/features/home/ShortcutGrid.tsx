import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { haptics } from '@/services/haptics';
import { spacing } from '@/theme';
import type { IconName } from '@/types';

import { home } from './homeTheme';

export interface Shortcut {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
}

const TILE = 64;

function ShortcutTile({ label, icon, onPress }: Shortcut) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      scaleTo={0.92}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={styles.item}
    >
      <View style={styles.tile}>
        {/* A darker copy underneath gives the glyph a bit of depth, like the 3D icons it imitates. */}
        <Ionicons name={icon} size={44} color="#1F5FB8" style={[styles.glyph, styles.glyphShadow]} />
        <Ionicons name={icon} size={44} color="#6CC0FF" style={styles.glyph} />
      </View>
      <AppText variant="captionStrong" color={home.text} numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export function ShortcutGrid({ items }: { items: Shortcut[] }) {
  return (
    <View style={styles.grid}>
      {items.map(({ key, ...item }) => (
        <ShortcutTile key={key} {...item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xl,
  },
  item: {
    width: '25%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 18,
    backgroundColor: home.tile,
    borderBottomWidth: 4,
    borderBottomColor: '#252C40',
  },
  glyph: {
    position: 'absolute',
    top: -6,
    right: -8,
  },
  glyphShadow: {
    transform: [{ translateX: 2 }, { translateY: 3 }],
  },
  label: {
    paddingHorizontal: 2,
  },
});
