import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n';
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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ru',
      setLanguage: (language) => set({ language }),
      studyLanguage: DEFAULT_STUDY_LANGUAGE,
      setStudyLanguage: (studyLanguage) => set({ studyLanguage }),
      showTranscript: true,
      toggleTranscript: () => set((state) => ({ showTranscript: !state.showTranscript })),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** The pack of the language being learned; re-renders when the learner switches language. */
export function useStudyLanguage(): StudyLanguagePack {
  return studyLanguagePack(useSettingsStore((state) => state.studyLanguage));
}
