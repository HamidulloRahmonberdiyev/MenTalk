import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { Chip } from '../profile/Chip';
import { REMINDER_TIMES, formatTime, useRemindersStore } from './remindersStore';
import { reminderPermission, requestReminderPermission, sendReminderPreview, type ReminderPermission } from './scheduler';

const TIME_EMOJI = ['🌅', '🥪', '🌆', '🌙', '✨'] as const;

/** Keeps the shown permission current, including after a trip to the phone's settings. */
function usePermission(visible: boolean): [ReminderPermission | null, () => void] {
  const [permission, setPermission] = useState<ReminderPermission | null>(null);
  const refresh = () => void reminderPermission().then(setPermission);

  useEffect(() => {
    if (!visible) return;
    refresh();
    const subscription = AppState.addEventListener('change', (status) => status === 'active' && refresh());
    return () => subscription.remove();
  }, [visible]);

  return [permission, refresh];
}

export function ReminderSettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const enabled = useRemindersStore((state) => state.enabled);
  const time = useRemindersStore((state) => state.time);
  const [permission, refreshPermission] = usePermission(visible);
  const [previewSent, setPreviewSent] = useState(false);
  const blocked = permission === 'denied';

  const close = () => {
    setPreviewSent(false);
    onClose();
  };

  const toggle = async (next: boolean) => {
    haptics.selection();
    useRemindersStore.getState().setEnabled(next);
    if (next && permission === 'undetermined') {
      await requestReminderPermission();
      refreshPermission();
    }
  };

  const preview = async () => {
    haptics.light();
    if (permission !== 'granted' && !(await requestReminderPermission())) return refreshPermission();
    if (await sendReminderPreview()) setPreviewSent(true);
  };

  return (
    <BottomSheet visible={visible} onClose={close} closeLabel={t('common.cancel')}>
      <View style={styles.badge}>
        <Ionicons name="notifications" size={32} color={colors.primary} />
      </View>
      <AppText variant="title" style={styles.center} accessibilityRole="header">
        {t('reminders.settings.title')}
      </AppText>
      <AppText color={home.textSecondary} style={styles.center}>
        {t('reminders.settings.text')}
      </AppText>

      <View style={styles.switchRow}>
        <AppText variant="bodyStrong" color={home.text} style={styles.flex}>
          {t('reminders.settings.toggle')}
        </AppText>
        <Switch
          value={enabled && !blocked}
          disabled={blocked}
          onValueChange={(next) => void toggle(next)}
          trackColor={{ true: colors.primary, false: home.track }}
          accessibilityLabel={t('reminders.settings.toggle')}
        />
      </View>

      {blocked ? (
        <View style={styles.blocked}>
          <AppText variant="caption" color={home.textSecondary}>
            {t('reminders.settings.blocked')}
          </AppText>
          <Button title={t('reminders.settings.openSettings')} variant="soft" icon="settings-outline" onPress={() => void Linking.openSettings()} />
        </View>
      ) : null}

      {enabled && !blocked ? (
        <>
          <AppText variant="captionStrong" color={home.textMuted} style={styles.label}>
            {t('reminders.settings.time')}
          </AppText>
          <View style={styles.times} accessibilityRole="radiogroup">
            {REMINDER_TIMES.map((option, index) => (
              <Chip
                key={formatTime(option)}
                emoji={TIME_EMOJI[index]}
                label={formatTime(option)}
                selected={option.hour === time.hour && option.minute === time.minute}
                onPress={() => useRemindersStore.getState().setTime(option)}
              />
            ))}
          </View>
          <Button
            title={previewSent ? t('reminders.settings.previewSent') : t('reminders.settings.preview')}
            variant="soft"
            icon={previewSent ? 'checkmark-circle' : 'paper-plane-outline'}
            disabled={previewSent}
            onPress={() => void preview()}
          />
        </>
      ) : null}
    </BottomSheet>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    badge: {
      width: 64,
      height: 64,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.xl,
      backgroundColor: home.primarySoft,
    },
    center: { textAlign: 'center' },
    flex: { flex: 1 },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    blocked: { gap: spacing.sm },
    label: { textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.sm },
    times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  });
