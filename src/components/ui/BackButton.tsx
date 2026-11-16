import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { IconName } from '@/types';

import { Pressable3D } from './Pressable3D';

interface BackButtonProps {
  onPress: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
}

/** The chunky square back button of the app's headers: a panel face resting on its edge. */
export function BackButton({ onPress, icon = 'arrow-back', accessibilityLabel }: BackButtonProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t('common.back')}
      hitSlop={8}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={home.rimBottom}
      depth={4}
      radius={radii.md}
      faceStyle={styles.face}
    >
      <Ionicons name={icon} size={22} color={home.text} />
    </Pressable3D>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    face: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
  });
