import { AppState } from 'react-native';

import { useVocabularyStore } from '@/features/vocabulary/vocabularyStore';
import { isApiConfigured } from '@/services/api/config';
import { onUnauthorized } from '@/services/api/tokenStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';

import { pushLanguage } from './profileSync';
import { scheduleVocabularySync, syncVocabulary } from './vocabularySync';

export { pushOnboarding } from './profileSync';
export { submitReviews } from './vocabularySync';

/** Forgets the signed-in person's data on this device. */
export function endSession(): void {
  useUserStore.getState().reset();
  useVocabularyStore.getState().clear();
}

/**
 * Keeps the device and the server in step for the life of the app: word-list changes and language
 * changes are sent as they happen, and coming back to the foreground syncs again.
 * `onSignedOut` runs when the server stops accepting the session token.
 */
export function startSession(onSignedOut: () => void): () => void {
  if (!isApiConfigured) return () => undefined;

  const unsubscribers = [
    useVocabularyStore.subscribe((state, previous) => {
      if (state.cards !== previous.cards || state.removed !== previous.removed) scheduleVocabularySync();
    }),
    useSettingsStore.subscribe((state, previous) => {
      if (state.language !== previous.language) void pushLanguage(state.language);
    }),
    onUnauthorized(() => {
      endSession();
      onSignedOut();
    }),
  ];
  const appState = AppState.addEventListener('change', (status) => {
    if (status === 'active') void syncVocabulary();
  });

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    appState.remove();
  };
}
