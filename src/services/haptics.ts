import * as Haptics from 'expo-haptics';

/** Fire-and-forget haptics; failures (e.g. unsupported devices) are ignored. */
function safe(task: Promise<void>): void {
  task.catch(() => undefined);
}

export const haptics = {
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  selection: () => safe(Haptics.selectionAsync()),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
