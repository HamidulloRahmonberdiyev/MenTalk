import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Language } from '@/i18n';
import { deviceLanguage } from '@/i18n/deviceLanguage';
import { DEFAULT_STUDY_LANGUAGE, studyLanguagePack, type StudyLanguage, type StudyLanguagePack } from '@/services/learning';
import { TUTOR_CHARACTERS, type TutorCharacter, type TutorTone } from '@/types';

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
  /** The tutor's look on the conversation screen, chosen in the profile. */
  tutorCharacter: TutorCharacter;
  setTutorCharacter: (character: TutorCharacter) => void;
  /** The tone new conversations start in; the last one picked in a chat or the profile. */
  tutorTone: TutorTone;
  setTutorTone: (tone: TutorTone) => void;
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
      tutorCharacter: 'bubble',
      setTutorCharacter: (tutorCharacter) => set({ tutorCharacter }),
      tutorTone: 'calm',
      setTutorTone: (tutorTone) => set({ tutorTone }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage),
      // A look saved before the robot and 3D tutors were removed falls back to the default.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        const known = saved.tutorCharacter && TUTOR_CHARACTERS.includes(saved.tutorCharacter);
        return { ...current, ...saved, tutorCharacter: known ? saved.tutorCharacter! : current.tutorCharacter };
      },
    },
  ),
);

/**
 * The tone picker (calm / funny / angry) is hidden for now, in the chat and in the profile. Until it
 * is back, every chat runs calm, even for a learner who picked another tone before; the saved choice
 * is kept. Set to true (and restore the pickers) to bring it back.
 */
export const TONE_PICKER = false;

/** The tone chats actually use: the learner's choice while the picker is on, calm otherwise. */
export const activeTutorTone = (state: Pick<SettingsState, 'tutorTone'>): TutorTone => (TONE_PICKER ? state.tutorTone : 'calm');

/** The pack of the language being learned; re-renders when the learner switches language. */
export function useStudyLanguage(): StudyLanguagePack {
  return studyLanguagePack(useSettingsStore((state) => state.studyLanguage));
}
