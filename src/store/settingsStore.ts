import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n';
import { deviceLanguage } from '@/i18n/deviceLanguage';
import { DEFAULT_STUDY_LANGUAGE, studyLanguagePack, type StudyLanguage, type StudyLanguagePack } from '@/services/learning';

interface SettingsState {
  language: Language;
  setLanguage: (language: Language) => void;
  /** The language being learned: what the tutor speaks and the word games drill. */
  studyLanguage: StudyLanguage;
  setStudyLanguage: (language: StudyLanguage) => void;
  /** Show what the user said as text in the conversation. */
  showTranscript: boolean;
  toggleTranscript: () => void;
  /** Dark or light look of the redesigned screens, chosen in the profile. */
  appearance: 'dark' | 'light';
  setAppearance: (appearance: 'dark' | 'light') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Only the first launch: afterwards the stored choice wins.
      language: deviceLanguage(),
      setLanguage: (language) => set({ language }),
      studyLanguage: DEFAULT_STUDY_LANGUAGE,
      setStudyLanguage: (studyLanguage) => set({ studyLanguage }),
      showTranscript: true,
      toggleTranscript: () => set((state) => ({ showTranscript: !state.showTranscript })),
      appearance: 'dark',
      setAppearance: (appearance) => set({ appearance }),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** The pack of the language being learned; re-renders when the learner switches language. */
export function useStudyLanguage(): StudyLanguagePack {
  return studyLanguagePack(useSettingsStore((state) => state.studyLanguage));
}
