import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n';

interface SettingsState {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Show what the user said as text in the conversation. */
  showTranscript: boolean;
  toggleTranscript: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ru',
      setLanguage: (language) => set({ language }),
      showTranscript: true,
      toggleTranscript: () => set((state) => ({ showTranscript: !state.showTranscript })),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
