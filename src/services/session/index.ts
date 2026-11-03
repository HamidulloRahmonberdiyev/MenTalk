import { AppState } from 'react-native';

import { useNotificationsStore } from '@/features/notifications/notificationsStore';
import { useRemindersStore } from '@/features/reminders/remindersStore';
import { cancelReminders } from '@/features/reminders/scheduler';
import { useVocabularyStore } from '@/features/vocabulary/vocabularyStore';
import { isApiConfigured } from '@/services/api/config';
import { onUnauthorized } from '@/services/api/tokenStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';

import { scheduleNotificationsFlush, syncNotifications } from './notificationsSync';
import { pushLanguage } from './profileSync';
import { scheduleVocabularySync, syncVocabulary } from './vocabularySync';

export { syncNotifications } from './notificationsSync';
export { pushOnboarding, refreshFromServer, saveAvatar, saveProfile, type ProfileEdits } from './profileSync';
export { submitReviews } from './vocabularySync';

/** Forgets the signed-in person's data on this device. */
export function endSession(): void {
  useUserStore.getState().reset();
  useVocabularyStore.getState().clear();
  useNotificationsStore.getState().reset();
  // Reminders speak to one person by name; the next one to sign in starts fresh.
  cancelReminders();
  useRemindersStore.getState().reset();
}

/**
 * Keeps the device and the server in step for the life of the app: word-list, inbox and language
 * changes are sent as they happen, and coming back to the foreground syncs again.
 * `onSignedOut` runs when the server stops accepting the session token.
 */
export function startSession(onSignedOut: () => void): () => void {
  if (!isApiConfigured) return () => undefined;

  const unsubscribers = [
    useVocabularyStore.subscribe((state, previous) => {
      if (state.cards !== previous.cards || state.removed !== previous.removed) scheduleVocabularySync();
    }),
    useNotificationsStore.subscribe((state, previous) => {
      if (state.outbox !== previous.outbox) scheduleNotificationsFlush();
    }),
    useSettingsStore.subscribe((state, previous) => {
      if (state.language === previous.language) return;
      void pushLanguage(state.language);
      // The server words notifications in the language asked for, so they are fetched again.
      void syncNotifications();
    }),
    onUnauthorized(() => {
      endSession();
      onSignedOut();
    }),
  ];
  const appState = AppState.addEventListener('change', (status) => {
    if (status !== 'active') return;
    void syncVocabulary();
    void syncNotifications();
  });

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    appState.remove();
  };
}
