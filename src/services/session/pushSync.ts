import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { translatorFor } from '@/i18n';
import { isApiConfigured } from '@/services/api/config';
import { endpoints } from '@/services/api/endpoints';
import { getToken } from '@/services/api/tokenStore';
import { useSettingsStore } from '@/store/settingsStore';

import { syncNotifications } from './notificationsSync';

/**
 * Pushes from the server (announcements, achievements). Delivery goes server → Expo → FCM/APNs →
 * phone, so it works with the app closed. Local reminders are separate and need none of this.
 */

/** The server names this channel in every push; Android drops a push whose channel does not exist. */
const CHANNEL_ID = 'inbox';
/** Set by the server in `data.source`, to tell its pushes from the device's own reminders. */
export const PUSH_SOURCE = 'mentalk-push';

const platform = Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : null;

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const t = translatorFor(useSettingsStore.getState().language);
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: t('push.channel.name'),
    description: t('push.channel.description'),
    // High, so these drop down over the screen while the app is closed.
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#1CB0F6',
  });
}

/** The token the server already has for this session; a sign-in has to send it again. */
let registered: string | null = null;
let registering: Promise<void> | null = null;

/**
 * Tells the server where to reach this device. Safe to call often: it sends only what is new.
 * Never throws, because the app works without push: offline, or on a build without Firebase, the
 * next launch or return to the foreground tries again.
 */
export function registerPush(): Promise<void> {
  if (!isApiConfigured || platform === null) return Promise.resolve();
  registering ??= (async () => {
    try {
      if ((await getToken()) === null) return;
      await ensureChannel();
      if (!(await Notifications.getPermissionsAsync()).granted) return;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (token === registered) return;
      await endpoints.registerPushToken(token, platform);
      registered = token;
    } catch (error) {
      if (__DEV__) console.warn('[push] registration failed', error);
    }
  })().finally(() => {
    registering = null;
  });
  return registering;
}

/** Sign-out: the server drops the token with the session, so the next sign-in must send it anew. */
export function forgetPushRegistration(): void {
  registered = null;
}

/** Returns a cleanup. */
export function startPush(): () => void {
  if (platform === null) return () => undefined;
  const subscriptions = [
    // FCM rotates tokens now and then, and the old one stops working.
    Notifications.addPushTokenListener(() => void registerPush()),
    // With the app open, the inbox and its badge follow at once.
    Notifications.addNotificationReceivedListener((notification) => {
      if (notification.request.content.data?.source === PUSH_SOURCE) void syncNotifications();
    }),
  ];
  return () => subscriptions.forEach((subscription) => subscription.remove());
}
