import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LanguageCode, SavedTranslation, UzbekScript } from '@/types';

import type { SourceLanguage } from './translateService';

const HISTORY_LIMIT = 60;
/** Typing produces a translation per pause; entries that grow out of each other within this window replace one another. */
const MERGE_WINDOW_MS = 45_000;

interface TranslatorState {
  source: SourceLanguage;
  target: LanguageCode;
  uzScript: UzbekScript;
  history: SavedTranslation[];
  favorites: SavedTranslation[];
  setLanguages: (source: SourceLanguage, target: LanguageCode) => void;
  setUzScript: (script: UzbekScript) => void;
  addHistory: (entry: Omit<SavedTranslation, 'id' | 'createdAt'>) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  toggleFavorite: (entry: Omit<SavedTranslation, 'id' | 'createdAt'>) => void;
}

const sameEntry = (a: Omit<SavedTranslation, 'id' | 'createdAt'>, b: Omit<SavedTranslation, 'id' | 'createdAt'>) =>
  a.sourceText === b.sourceText && a.translation === b.translation && a.targetLanguage === b.targetLanguage;

export const useTranslatorStore = create<TranslatorState>()(
  persist(
    (set) => ({
      source: 'auto',
      target: 'uz',
      uzScript: 'latin',
      history: [],
      favorites: [],
      setLanguages: (source, target) => set({ source, target }),
      setUzScript: (uzScript) => set({ uzScript }),
      addHistory: (entry) =>
        set((state) => {
          const now = Date.now();
          const [latest, ...rest] = state.history;
          const growsFromLatest =
            latest &&
            now - latest.createdAt < MERGE_WINDOW_MS &&
            (entry.sourceText.startsWith(latest.sourceText) || latest.sourceText.startsWith(entry.sourceText));
          const withoutDuplicate = (growsFromLatest ? rest : state.history).filter((item) => !sameEntry(item, entry));
          return { history: [{ ...entry, id: `${now}`, createdAt: now }, ...withoutDuplicate].slice(0, HISTORY_LIMIT) };
        }),
      removeHistory: (id) => set((state) => ({ history: state.history.filter((item) => item.id !== id) })),
      clearHistory: () => set({ history: [] }),
      toggleFavorite: (entry) =>
        set((state) => {
          const exists = state.favorites.some((item) => sameEntry(item, entry));
          return {
            favorites: exists
              ? state.favorites.filter((item) => !sameEntry(item, entry))
              : [{ ...entry, id: `${Date.now()}`, createdAt: Date.now() }, ...state.favorites],
          };
        }),
    }),
    { name: 'translator', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const isFavorite = (favorites: SavedTranslation[], entry: Omit<SavedTranslation, 'id' | 'createdAt'>) =>
  favorites.some((item) => sameEntry(item, entry));
