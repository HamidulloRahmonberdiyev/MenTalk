import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { DEFAULT_STUDY_LANGUAGE, studyLanguageOfWord, type StudyLanguage } from '@/services/learning';
import { useSettingsStore } from '@/store/settingsStore';
import type { ReviewRating, VocabCard, WordSource, WordSuggestion } from '@/types';

import type { GameMode } from './exercises';
import { currentStreak, dayKey, streakAfterRound } from './progress';
import { fromLadder, isDue, newCard, review } from './srs';
import { normalizeWord } from './words';

/** A word deleted on this device, kept until the server has been told. */
export interface RemovedWord {
  at: number;
  language: StudyLanguage;
  serverId?: string;
}

interface VocabularyState {
  cards: VocabCard[];
  xp: number;
  streak: number;
  /** Local day (YYYY-MM-DD) of the last finished round. */
  lastDay: string | null;
  /** The "tap any word to save it" tip is shown until the learner has opened a word once. */
  tipSeen: boolean;
  /** The game type played last, offered first next time. */
  lastMode: GameMode;
  /** Words deleted on this device, by local id. */
  removed: Record<string, RemovedWord>;
  /** Where the server's changes were last read up to. */
  cursor: string | null;
  /** Local changes made up to this time (ms) have been sent to the server. */
  pushedAt: number;
  /** Adds words that are not saved yet; returns how many were new. */
  addWords: (suggestions: WordSuggestion[], source?: WordSource) => number;
  removeWord: (id: string) => void;
  /** Records one answer in the learning schedule. */
  reviewWord: (id: string, rating: ReviewRating) => void;
  /** Banks the round's XP and extends the daily streak. */
  finishRound: (xp: number) => void;
  markTipSeen: () => void;
  setLastMode: (mode: GameMode) => void;
  /**
   * Merges what the server sent back: newer cards replace local ones, deletions remove them.
   * Cards are matched on the server id first, since the server may spell a word differently.
   */
  applyRemote: (cards: VocabCard[], deleted: Pick<VocabCard, 'id' | 'serverId'>[], sync: { cursor: string; pushedAt: number }) => void;
  setXp: (xp: number) => void;
  /** Forgets everything, e.g. when another person signs in. */
  clear: () => void;
}

const EMPTY_SYNC = { removed: {}, cursor: null, pushedAt: 0 } as const;

const changedAt = (card: VocabCard): number => card.updatedAt ?? card.addedAt;

/** A card as stored before SM-2 (store version 1 and earlier). */
type LadderCard = Omit<VocabCard, 'status' | 'ease' | 'intervalDays' | 'repetitions'> & { stage?: number; streak?: number };

export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set, get) => ({
      cards: [],
      xp: 0,
      streak: 0,
      lastDay: null,
      tipSeen: false,
      lastMode: 'mixed',
      ...EMPTY_SYNC,
      addWords: (suggestions, source = 'manual') => {
        const known = new Set(get().cards.map((card) => card.id));
        const now = Date.now();
        const translationLanguage = useSettingsStore.getState().language;
        const added = suggestions
          .filter((item) => item.word.trim() && item.translation.trim())
          .map((item) => ({ ...newCard({ ...item, translationLanguage: item.translationLanguage ?? translationLanguage }, now), source }))
          .filter((card) => {
            if (known.has(card.id)) return false;
            known.add(card.id);
            return true;
          });
        if (added.length) set((state) => ({ cards: [...added, ...state.cards] }));
        return added.length;
      },
      removeWord: (id) =>
        set((state) => {
          const card = state.cards.find((item) => item.id === id);
          const language = card ? cardLanguage(card) : (studyLanguageOfWord(id) ?? DEFAULT_STUDY_LANGUAGE);
          return {
            cards: state.cards.filter((item) => item.id !== id),
            removed: { ...state.removed, [id]: { at: Date.now(), language, serverId: card?.serverId } },
          };
        }),
      reviewWord: (id, rating) =>
        set((state) => ({ cards: state.cards.map((card) => (card.id === id ? review(card, rating, Date.now()) : card)) })),
      finishRound: (xp) =>
        set((state) => {
          const now = Date.now();
          return { xp: state.xp + xp, streak: streakAfterRound(state.streak, state.lastDay, now), lastDay: dayKey(now) };
        }),
      markTipSeen: () => set({ tipSeen: true }),
      setLastMode: (lastMode) => set({ lastMode }),
      applyRemote: (incoming, deleted, { cursor, pushedAt }) =>
        set((state) => {
          const byId = new Map(state.cards.map((card) => [card.id, card]));
          const idByServerId = new Map(state.cards.flatMap((card) => (card.serverId ? [[card.serverId, card.id] as const] : [])));
          const localId = (card: Pick<VocabCard, 'id' | 'serverId'>) => (card.serverId && idByServerId.get(card.serverId)) || card.id;

          for (const card of deleted) {
            const id = localId(card);
            const local = byId.get(id);
            if (local && changedAt(local) <= pushedAt) byId.delete(id);
          }
          for (const card of incoming) {
            const id = localId(card);
            const local = byId.get(id);
            if (!local || changedAt(local) < (card.updatedAt ?? 0)) {
              byId.set(id, { ...card, id, addedAt: local?.addedAt ?? card.addedAt });
            } else if (local.serverId !== card.serverId) {
              // The local edit is newer, but the server id must still be learned.
              byId.set(id, { ...local, serverId: card.serverId });
            }
          }
          const removed = Object.fromEntries(Object.entries(state.removed).filter(([, word]) => word.at > pushedAt));
          const cards = [...byId.values()].sort((a, b) => b.addedAt - a.addedAt);
          return { cards, removed, cursor, pushedAt };
        }),
      setXp: (xp) => set({ xp }),
      clear: () => set({ cards: [], xp: 0, streak: 0, lastDay: null, ...EMPTY_SYNC }),
    }),
    {
      name: 'vocabulary',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Omit<VocabularyState, 'cards' | 'removed'> & { cards?: LadderCard[]; removed?: Record<string, number | RemovedWord> };
        if (version >= 2) return state as unknown as VocabularyState;
        return {
          ...state,
          // The seven-step ladder becomes SM-2, mapped the way the server mapped its copy.
          cards: (state.cards ?? []).map(({ stage, streak: _streak, ...card }) => ({ ...card, ...fromLadder(stage ?? 0), lapses: card.lapses ?? 0 })),
          removed: Object.fromEntries(
            Object.entries(state.removed ?? {}).map(([id, at]) => [
              id,
              typeof at === 'number' ? { at, language: studyLanguageOfWord(id) ?? DEFAULT_STUDY_LANGUAGE } : at,
            ]),
          ),
          // Read everything once more: the server's copy now carries the ids this device needs.
          cursor: null,
        } as VocabularyState;
      },
    },
  ),
);

/** The language a word belongs to; words saved before English existed are Russian. */
export const cardLanguage = (card: Pick<WordSuggestion, 'language'>): StudyLanguage => card.language ?? DEFAULT_STUDY_LANGUAGE;

export const cardsIn = (cards: VocabCard[], language: StudyLanguage): VocabCard[] => cards.filter((card) => cardLanguage(card) === language);

/**
 * The saved words of the language being learned. All languages share one list (and one sync), but
 * every screen and game only ever works with the words of the current one.
 */
export function useStudyCards(): VocabCard[] {
  const language = useSettingsStore((state) => state.studyLanguage);
  return useVocabularyStore(useShallow((state) => cardsIn(state.cards, language)));
}

/** `useStudyCards` outside React, read at the moment of the call. */
export const currentStudyCards = (): VocabCard[] => cardsIn(useVocabularyStore.getState().cards, useSettingsStore.getState().studyLanguage);

export const countDue = (cards: VocabCard[], now: number = Date.now()): number =>
  cards.reduce((total, card) => total + (isDue(card, now) ? 1 : 0), 0);

/** The streak as the learner should see it today (a missed day shows as zero). */
export const visibleStreak = (state: Pick<VocabularyState, 'streak' | 'lastDay'>, now: number = Date.now()): number =>
  currentStreak(state.streak, state.lastDay, now);

/** The saved card that a tapped word belongs to, matched on dictionary form or on the form seen in text. */
export function findCard(cards: VocabCard[], word: string): VocabCard | undefined {
  const key = normalizeWord(word);
  return cards.find((card) => card.id === key || (card.form !== undefined && normalizeWord(card.form) === key));
}
