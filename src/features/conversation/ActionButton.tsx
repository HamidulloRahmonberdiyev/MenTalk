import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { IconName } from '@/types';

interface ActionButtonProps {
  icon: IconName;
  label: string;
  active?: boolean;
  /** Spoken label when it differs from the visible one. */
  accessibilityLabel?: string;
  onPress: () => void;
}

const SIZE = 60;
const DEPTH = 5;

/** Round secondary action under the mic (keyboard, transcript, hint) that presses down onto its edge. */
export function ActionButton({ icon, label, active = false, accessibilityLabel, onPress }: ActionButtonProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.root}>
      <Pressable3D
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected: active }}
        onPress={() => {
          haptics.selection();
          onPress();
        }}
        edgeColor={active ? '#1A84BF' : home.rimBottom}
        depth={DEPTH}
        radius={SIZE / 2}
        style={styles.button}
        faceStyle={[styles.face, active && styles.faceActive]}
      >
        <Ionicons name={icon} size={26} color={active ? colors.onPrimary : home.accent} />
      </Pressable3D>
      <AppText variant="captionStrong" color={home.textSecondary}>
        {label}
      </AppText>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { alignItems: 'center', gap: spacing.xs, minWidth: 84 },
    button: { width: SIZE, height: SIZE + DEPTH },
    face: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    faceActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  });
