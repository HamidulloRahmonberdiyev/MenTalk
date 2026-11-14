import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { enter } from '@/theme/motion';
import { usePalette } from '@/theme/appearance';
import type { IconName } from '@/types';

interface StatTileProps {
  label: string;
  value: string;
  icon: IconName;
  /** The frame and the label band. */
  color: string;
  /** The value inside: a shade deeper than the frame, so it reads on white. */
  ink: string;
  delay: number;
}

/** A lesson-complete tile: a coloured frame with its label on top and the value on the card inside it. */
export function StatTile({ label, value, icon, color, ink, delay }: StatTileProps) {
  const home = usePalette();
  const valueInk = home.appearance === 'dark' ? color : ink;

  return (
    <Animated.View
      entering={enter.rise(delay)}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.tile, { backgroundColor: color, borderColor: color }]}
    >
      <AppText color="#FFFFFF" style={styles.label} numberOfLines={1} adjustsFontSizeToFit>
        {label.toLocaleUpperCase()}
      </AppText>
      <View style={[styles.body, { backgroundColor: home.panel }]}>
        <Ionicons name={icon} size={20} color={color} />
        <AppText color={valueInk} style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: 18, borderWidth: 2.5, overflow: 'hidden' },
  label: { textAlign: 'center', paddingTop: 4, paddingBottom: 5, paddingHorizontal: 6, fontSize: 11, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8 },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 15,
  },
  value: { flexShrink: 1, fontSize: 19, lineHeight: 24, fontWeight: '900' },
});
