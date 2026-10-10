import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type ButtonVariant = 'primary' | 'soft' | 'danger';

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
  const isPrimary = variant === 'primary';
  const foreground = variant === 'soft' ? colors.primary : colors.onPrimary;
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

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={[styles.base, isPrimary ? shadows.primary : variant === 'danger' ? styles.danger : styles.soft, inactive && styles.inactive, style]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[colors.primaryLight, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 58,
    borderRadius: radii.md,
    overflow: 'visible',
  },
  fill: {
    flex: 1,
    borderRadius: radii.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  soft: {
    backgroundColor: colors.primarySoft,
  },
  danger: {
    backgroundColor: colors.danger,
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
