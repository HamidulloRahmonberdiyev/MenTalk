import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, spacing } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { Button } from './Button';

interface ConfirmSheetProps {
  visible: boolean;
  icon: IconName;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button, for actions that cannot be undone or sign the person out. */
  destructive?: boolean;
  /** While the action runs: the buttons lock and the sheet cannot be dismissed. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Bottom sheet that asks the learner to confirm an action. Replaces the plain system alert. */
export function ConfirmSheet({
  visible,
  icon,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const tint = destructive ? colors.danger : colors.primary;
  const dismiss = loading ? undefined : onCancel;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel={cancelLabel} />
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}
        >
          <View style={styles.grabber} />
          <View style={[styles.badge, { backgroundColor: destructive ? colors.dangerSoft : colors.primarySoft }]}>
            <Ionicons name={icon} size={32} color={tint} />
          </View>
          <View style={styles.texts}>
            <AppText variant="title" style={styles.center} accessibilityRole="header">
              {title}
            </AppText>
            <AppText color={colors.textSecondary} style={styles.center}>
              {message}
            </AppText>
          </View>
          <View style={styles.actions}>
            <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} loading={loading} onPress={onConfirm} />
            <Button title={cancelLabel} variant="soft" disabled={loading} onPress={onCancel} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14, 27, 44, 0.45)' },
  sheet: {
    alignItems: 'stretch',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  badge: { alignSelf: 'center', width: 72, height: 72, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  texts: { gap: spacing.sm },
  center: { textAlign: 'center' },
  actions: { gap: spacing.md },
});
