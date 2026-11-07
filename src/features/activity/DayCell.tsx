import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

/** Practice green, the same as the daily goal card. */
export const GREEN = '#58CC02';
export const FLAME = '#FF9600';
/** Fill of a cell per practice level 1..4 (index 0 unused: an idle day has the track colour). */
const FILL = ['', `${GREEN}38`, `${GREEN}75`, `${GREEN}B8`, GREEN] as const;

export const CIRCLE = 36;

interface DayCellProps {
  label: string;
  level: 0 | 1 | 2 | 3 | 4;
  /** Practised the day before / after in the same row: the streak band runs on into the neighbour. */
  joinLeft?: boolean;
  joinRight?: boolean;
  today?: boolean;
  selected?: boolean;
  future?: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
}

/** One day: a circle tinted by how much was practised, linked to its neighbours while a streak runs. */
export function DayCell({ label, level, joinLeft, joinRight, today, selected, future, accessibilityLabel, onPress }: DayCellProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const strong = level >= 3;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled: future }}
      disabled={future || !onPress}
      onPress={onPress}
      style={styles.cell}
    >
      {joinLeft ? <View style={[styles.band, styles.bandLeft]} /> : null}
      {joinRight ? <View style={[styles.band, styles.bandRight]} /> : null}
      <View
        style={[
          styles.circle,
          { backgroundColor: level ? FILL[level] : future ? 'transparent' : home.track },
          today && styles.today,
          selected && styles.selected,
        ]}
      >
        <AppText
          color={strong ? '#FFFFFF' : future ? home.textMuted : home.text}
          style={[styles.label, (strong || today) && styles.labelStrong, future && styles.future]}
        >
          {label}
        </AppText>
      </View>
      {level === 4 ? (
        <View style={styles.flame} pointerEvents="none">
          <Ionicons name="flame" size={11} color={FLAME} />
        </View>
      ) : null}
    </Pressable>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    cell: { flex: 1, height: CIRCLE + 10, alignItems: 'center', justifyContent: 'center' },
    band: { position: 'absolute', top: 5 + CIRCLE * 0.18, height: CIRCLE * 0.64, backgroundColor: `${GREEN}2E` },
    bandLeft: { left: 0, right: '50%' },
    bandRight: { left: '50%', right: 0 },
    circle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    today: { borderWidth: 2, borderColor: colors.primary },
    selected: { borderWidth: 2.5, borderColor: home.text, transform: [{ scale: 1.08 }] },
    label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
    labelStrong: { fontWeight: '800' },
    future: { opacity: 0.45 },
    flame: {
      position: 'absolute',
      top: 0,
      right: '50%',
      marginRight: -CIRCLE / 2 - 3,
      width: 17,
      height: 17,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.panel,
    },
  });
