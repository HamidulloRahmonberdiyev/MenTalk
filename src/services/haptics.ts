import * as Haptics from 'expo-haptics';

/** Fire-and-forget haptics; failures (e.g. unsupported devices) are ignored. */
function safe(task: Promise<void>): void {
  task.catch(() => undefined);
}

/** The taps after the first thump of `celebrate`: [ms after it, strength]. */
const CELEBRATION: readonly (readonly [number, Haptics.ImpactFeedbackStyle])[] = [
  [90, Haptics.ImpactFeedbackStyle.Medium],
  [180, Haptics.ImpactFeedbackStyle.Medium],
  [290, Haptics.ImpactFeedbackStyle.Light],
  [400, Haptics.ImpactFeedbackStyle.Light],
];

export const haptics = {
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  selection: () => safe(Haptics.selectionAsync()),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /**
   * A short "ta-da" for a finished chat: a heavy thump as the confetti bursts, a fading patter of taps
   * while it scatters, and a success buzz to close.
   */
  celebrate: () => {
    safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    CELEBRATION.forEach(([delay, style]) => setTimeout(() => safe(Haptics.impactAsync(style)), delay));
    setTimeout(() => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 560);
  },
};

