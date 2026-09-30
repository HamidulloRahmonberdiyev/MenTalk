import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  /** Optional trailing element; keeps the title centered. */
  right?: ReactNode;
  /** Use light foreground colors over dark imagery. */
  inverted?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({ title, onBack, right, inverted = false, style }: ScreenHeaderProps) {
  const t = useT();
  const foreground = inverted ? '#FFFFFF' : colors.text;

  return (
    <View style={[styles.row, style]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        hitSlop={8}
        onPress={() => {
          haptics.light();
          onBack();
        }}
        style={[styles.side, inverted && styles.inverted]}
      >
        <Ionicons name="chevron-back" size={24} color={foreground} />
      </PressableScale>
      <AppText variant="subheading" color={foreground} numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    gap: spacing.sm,
  },
  side: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    alignItems: 'flex-end',
  },
  inverted: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
