import * as Notifications from 'expo-notifications';
import type { Href } from 'expo-router';
import { AppState, Platform } from 'react-native';

import { translatorFor, type TranslationKey } from '@/i18n';
import { SCENARIOS } from '@/mocks/scenarios';
import { isApiConfigured } from '@/services/api/config';
import { getToken } from '@/services/api/tokenStore';
import { ACTION_ROUTES } from '@/services/session/notificationsSync';
import { PUSH_SOURCE, registerPush } from '@/services/session/pushSync';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';

import { currentStudyCards, useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { planReminders } from './planner';
import { useRemindersStore } from './remindersStore';

/**
 * Local reminders: planned and scheduled on the device by the OS, so they arrive with the app
 * closed, offline and without any server. The plan is redrawn whenever something that shapes it
 * changes (practice, words, settings, language) and each time the app goes to the background.
 */

const CHANNEL_ID = 'reminders';
/** Marks our notifications, so others (if any are added later) are never cancelled by mistake. */
const SOURCE = 'mentalk-reminder';
const PREVIEW_SOURCE = 'mentalk-reminder-preview';
const RESCHEDULE_DEBOUNCE_MS = 1_500;
/** Screens a reminder may open; anything else in a payload is ignored. */
const ALLOWED_ROUTES = new Set<string>(['/home', '/scenarios', '/practice', '/pronunciation', '/translate', '/words']);

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export type ReminderPermission = 'granted' | 'undetermined' | 'denied';

function grantedFrom(settings: Notifications.NotificationPermissionsStatus): boolean {
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function reminderPermission(): Promise<ReminderPermission> {
  if (!isSupported) return 'denied';
  const settings = await Notifications.getPermissionsAsync();
  if (grantedFrom(settings)) return 'granted';
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const t = translatorFor(useSettingsStore.getState().language);
  // Re-run on language change: Android lets an existing channel be renamed, nothing more.
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: t('reminders.channel.name'),
    description: t('reminders.channel.description'),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#1CB0F6',
  });
}

/** Shows the system prompt (Android 13+ needs a channel first). Returns whether reminders may be shown. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!isSupported) return false;
  await ensureChannel();
  const settings = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  const granted = grantedFrom(settings);
  if (granted) {
    scheduleReschedule(0);
    void registerPush();
  }
  return granted;
}

async function signedIn(): Promise<boolean> {
  return !isApiConfigured || (await getToken()) !== null;
}

async function cancelOurs(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((request) => request.content.data?.source === SOURCE).map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );
}

async function reschedule(): Promise<void> {
  const reminders = useRemindersStore.getState();
  if (!reminders.enabled || !(await signedIn()) || (await reminderPermission()) !== 'granted') {
    await cancelOurs();
    return;
  }

  const settings = useSettingsStore.getState();
  const t = translatorFor(settings.language, settings.studyLanguage);
  const user = useUserStore.getState();
  const lastTopic = user.lastScenarioId;
  const topics = [...SCENARIOS]
    .sort((a, b) => Number(b.id === lastTopic) - Number(a.id === lastTopic))
    .map(({ id }) => ({ id, title: t(`scenario.${id}.title` as TranslationKey) }));

  const plan = planReminders({
    now: Date.now(),
    time: reminders.time,
    language: settings.language,
    name: user.name,
    tutor: t('tutor.name'),
    lastActiveAt: reminders.lastActiveAt,
    streak: visibleStreak(useVocabularyStore.getState()),
    dueTimes: currentStudyCards().map((card) => card.due),
    topics,
  });

  await ensureChannel();
  await cancelOurs();
  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: reminder.title,
        body: reminder.body,
        sound: 'default',
        data: { source: SOURCE, url: reminder.url, category: reminder.category },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.at, channelId: CHANNEL_ID },
    });
  }
}

// One run at a time; a request during a run queues exactly one more.
let running: Promise<void> | null = null;
let queued = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function runReschedule(): void {
  if (running) {
    queued = true;
    return;
  }
  running = reschedule()
    .catch((error) => {
      if (__DEV__) console.warn('[reminders] reschedule failed', error);
    })
    .finally(() => {
      running = null;
      if (queued) {
        queued = false;
        runReschedule();
      }
    });
}

export function scheduleReschedule(delay = RESCHEDULE_DEBOUNCE_MS): void {
  if (!isSupported) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    runReschedule();
  }, delay);
}

/**
 * Sends the next planned reminder right away (marked as a preview, so it shows even with the app
 * open). Lets the learner see and hear what they are turning on. Returns false without permission.
 */
export async function sendReminderPreview(): Promise<boolean> {
  if (!isSupported || (await reminderPermission()) !== 'granted') return false;
  await ensureChannel();
  const settings = useSettingsStore.getState();
  const t = translatorFor(settings.language, settings.studyLanguage);
  const [next] = planReminders({
    now: Date.now(),
    time: useRemindersStore.getState().time,
    language: settings.language,
    name: useUserStore.getState().name,
    tutor: t('tutor.name'),
    lastActiveAt: useRemindersStore.getState().lastActiveAt,
    streak: visibleStreak(useVocabularyStore.getState()),
    dueTimes: currentStudyCards().map((card) => card.due),
    topics: [],
  });
  if (!next) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: next.title, body: next.body, sound: 'default', data: { source: PREVIEW_SOURCE, url: next.url } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: CHANNEL_ID },
  });
  return true;
}

/** Sign-out: nothing personal stays scheduled on the device. */
export function cancelReminders(): void {
  if (!isSupported) return;
  if (timer) clearTimeout(timer);
  void cancelOurs().catch(() => undefined);
}

// ── Tapping a reminder ────────────────────────────────────────────────────────────────────────

let pendingRoute: Href | null = null;
const routeListeners = new Set<() => void>();

function routeOf(response: Notifications.NotificationResponse): Href | null {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const data = response.notification.request.content.data;
  // A push without a screen of its own opens the inbox, where its full text is.
  if (data?.source === PUSH_SOURCE) return (typeof data.action === 'string' && ACTION_ROUTES[data.action]) || '/notifications';
  const ours = data?.source === SOURCE || data?.source === PREVIEW_SOURCE;
  return ours && typeof data.url === 'string' && ALLOWED_ROUTES.has(data.url) ? (data.url as Href) : null;
}

function handleResponse(response: Notifications.NotificationResponse | null): void {
  const route = response ? routeOf(response) : null;
  if (!route) return;
  pendingRoute = route;
  routeListeners.forEach((listener) => listener());
  void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
}

/**
 * The screen a tapped reminder asked for, taken once. The home screen opens it, so a cold start
 * still goes through sign-in and onboarding first.
 */
export function takeReminderRoute(): Href | null {
  const route = pendingRoute;
  pendingRoute = null;
  return route;
}

export function onReminderRoute(listener: () => void): () => void {
  routeListeners.add(listener);
  return () => routeListeners.delete(listener);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────────────────────

let started = false;

/** Call once from the root layout. Returns a cleanup for fast refresh. */
export function startReminders(): () => void {
  if (!isSupported || started) return () => undefined;
  started = true;

  Notifications.setNotificationHandler({
    // Inside the app the learner is already practising: a reminder would only interrupt.
    handleNotification: async (notification) => {
      const reminder = notification.request.content.data?.source === SOURCE;
      // On Android a silent notification does not drop down, so the banner needs the sound on too.
      return { shouldShowBanner: !reminder, shouldShowList: !reminder, shouldPlaySound: !reminder, shouldSetBadge: false };
    },
  });

  // A tap that launched the app from closed.
  handleResponse(Notifications.getLastNotificationResponse());
  const responses = Notifications.addNotificationResponseReceivedListener(handleResponse);

  const unsubscribers = [
    useRemindersStore.subscribe((state, previous) => {
      if (state.enabled !== previous.enabled || state.time !== previous.time || state.lastActiveAt !== previous.lastActiveAt) scheduleReschedule();
    }),
    useSettingsStore.subscribe((state, previous) => {
      if (state.language !== previous.language || state.studyLanguage !== previous.studyLanguage) scheduleReschedule();
    }),
    useVocabularyStore.subscribe((state, previous) => {
      // A finished word round is practice.
      if (state.lastDay !== previous.lastDay || state.streak !== previous.streak) useRemindersStore.getState().markActive();
      if (state.cards !== previous.cards) scheduleReschedule();
    }),
    useUserStore.subscribe((state, previous) => {
      // A new finished conversation is practice; history loaded from the server carries its own date.
      const latest = state.history[0];
      if (latest && latest !== previous.history[0]) useRemindersStore.getState().markActive(latest.date);
      if (state.name !== previous.name || state.lastScenarioId !== previous.lastScenarioId) scheduleReschedule();
    }),
  ];

  // Leaving the app is the natural moment to plan the days ahead from what happened today.
  const appState = AppState.addEventListener('change', (status) => {
    if (status === 'background') scheduleReschedule(0);
  });

  scheduleReschedule();

  return () => {
    started = false;
    responses.remove();
    appState.remove();
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
