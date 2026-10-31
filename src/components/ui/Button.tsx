import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { Pressable3D } from './Pressable3D';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

type ButtonVariant = 'primary' | 'soft' | 'danger';

const LOOKS: Record<Exclude<ButtonVariant, 'soft'>, { face: string; edge: string }> = {
  primary: { face: colors.primary, edge: '#1A84BF' },
  danger: { face: colors.danger, edge: '#B91C1C' },
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const foreground = variant === 'soft' ? home.accent : colors.onPrimary;
  const inactive = disabled || loading;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? <Ionicons name={icon} size={22} color={foreground} /> : null}
          <AppText variant="button" color={foreground}>
            {title}
          </AppText>
          {icon && iconPosition === 'right' ? <Ionicons name={icon} size={22} color={foreground} /> : null}
        </>
      )}
    </View>
  );

  const look =
    variant === 'soft' ? { face: home.primarySoft, edge: home.appearance === 'dark' ? '#2A5272' : '#B5DDF2' } : LOOKS[variant];
  const radius = StyleSheet.flatten(style)?.borderRadius ?? radii.md;

  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={look.edge}
      depth={4}
      radius={typeof radius === 'number' ? radius : radii.md}
      style={[styles.base, inactive && styles.inactive, style]}
      faceStyle={[styles.fill, { backgroundColor: look.face }]}
    >
      {content}
    </Pressable3D>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  base: {
    height: 58,
    borderRadius: radii.md,
  },
  fill: {
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  inactive: {
    opacity: 0.55,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
