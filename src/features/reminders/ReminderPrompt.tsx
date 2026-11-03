import { useEffect, useState } from 'react';

import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';

import { formatTime, useRemindersStore } from './remindersStore';
import { reminderPermission, requestReminderPermission } from './scheduler';

/** The first practice counts; asking on a cold first launch gets a reflexive "no". */
const ASK_AFTER_PRACTICE = true;

/**
 * Asks once, in the app's own words, before the system prompt. A "not now" here costs nothing,
 * whereas a "no" to the system prompt can only be undone in the phone's settings.
 */
export function ReminderPrompt() {
  const t = useT();
  const promptedAt = useRemindersStore((state) => state.promptedAt);
  const lastActiveAt = useRemindersStore((state) => state.lastActiveAt);
  const time = useRemindersStore((state) => state.time);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (promptedAt !== null || (ASK_AFTER_PRACTICE && lastActiveAt === null)) return;
    let cancelled = false;
    // A beat after the screen settles, so it does not land on top of the entry animation.
    const timer = setTimeout(() => {
      void reminderPermission().then((permission) => {
        if (cancelled) return;
        if (permission === 'undetermined') setVisible(true);
        else useRemindersStore.getState().markPrompted();
      });
    }, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [promptedAt, lastActiveAt]);

  const close = () => {
    useRemindersStore.getState().markPrompted();
    setVisible(false);
  };

  return (
    <ConfirmSheet
      visible={visible}
      icon="notifications"
      title={t('reminders.prompt.title')}
      message={t('reminders.prompt.text', { time: formatTime(time) })}
      confirmLabel={t('reminders.prompt.allow')}
      cancelLabel={t('reminders.prompt.later')}
      onConfirm={() => {
        haptics.success();
        close();
        void requestReminderPermission();
      }}
      onCancel={close}
      onDismiss={close}
    />
  );
}
