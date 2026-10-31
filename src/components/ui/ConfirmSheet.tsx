import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/types';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

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
  /**
   * Backdrop tap, drag-down and the back button. Defaults to `onCancel`; set it when the second
   * button is itself an action (e.g. "leave without saving") and dismissing should just stay put.
   */
  onDismiss?: () => void;
  /** After the sheet has slid away. */
  onClosed?: () => void;
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
  onDismiss = onCancel,
  onClosed,
}: ConfirmSheetProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const tint = destructive ? colors.danger : colors.primary;

  return (
    <BottomSheet visible={visible} onClose={loading ? undefined : onDismiss} onClosed={onClosed} closeLabel={cancelLabel}>
      <View style={[styles.badge, { backgroundColor: destructive ? home.dangerFill : home.primarySoft }]}>
        <Ionicons name={icon} size={32} color={tint} />
      </View>
      <View style={styles.texts}>
        <AppText variant="title" style={styles.center} accessibilityRole="header">
          {title}
        </AppText>
        <AppText color={home.textSecondary} style={styles.center}>
          {message}
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} loading={loading} onPress={onConfirm} />
        <Button title={cancelLabel} variant="soft" disabled={loading} onPress={onCancel} />
      </View>
    </BottomSheet>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  badge: { alignSelf: 'center', width: 72, height: 72, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  texts: { gap: spacing.sm },
  center: { textAlign: 'center' },
  actions: { gap: spacing.md },
});
