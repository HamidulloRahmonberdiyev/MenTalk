import type { Href } from 'expo-router';

import type { TranslationKey } from '@/i18n';

/** What a notification is about; sets its icon and colours. */
export type NotificationKind = 'streak' | 'review' | 'achievement' | 'lesson' | 'pronunciation' | 'news';

/**
 * Text the server sends is shown as it is; text made on the device is a translation key, so it
 * follows the interface language when that changes.
 */
export type NotificationText = string | { key: TranslationKey; params?: Record<string, string | number> };

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: NotificationText;
  body: NotificationText;
  createdAt: number;
  read: boolean;
  /** Where tapping it leads, with the label of its button. */
  action?: { href: Href; label: NotificationText };
  /** Came from the server: reading or removing it is reported back. */
  remote?: boolean;
}
