import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { VocabCard, WordSuggestion } from '@/types';

import { currentStreak, dayKey, streakAfterRound } from './progress';
import { isDue, newCard, review } from './srs';
import { normalizeWord } from './words';

interface VocabularyState {
  cards: VocabCard[];
  xp: number;
  streak: number;
  /** Local day (YYYY-MM-DD) of the last finished round. */
  lastDay: string | null;
  /** The "tap any word to save it" tip is shown until the learner has opened a word once. */
  tipSeen: boolean;
  /** Words deleted on this device (id → time), kept until the server has been told. */
  removed: Record<string, number>;
  /** Where the server's changes were last read up to. */
  cursor: string | null;
  /** Local changes made up to this time (ms) have been sent to the server. */
  pushedAt: number;
  /** Adds words that are not saved yet; returns how many were new. */
  addWords: (suggestions: WordSuggestion[]) => number;
  removeWord: (id: string) => void;
  /** Records one answer in the learning schedule. */
  reviewWord: (id: string, correct: boolean) => void;
  /** Banks the round's XP and extends the daily streak. */
  finishRound: (xp: number) => void;
  markTipSeen: () => void;
  /** Merges what the server sent back: newer cards replace local ones, deletions remove them. */
  applyRemote: (cards: VocabCard[], deleted: string[], sync: { cursor: string; pushedAt: number }) => void;
  setXp: (xp: number) => void;
  /** Forgets everything, e.g. when another person signs in. */
  clear: () => void;
}

const EMPTY_SYNC = { removed: {}, cursor: null, pushedAt: 0 } as const;

export const useVocabularyStore = create<VocabularyState>()(
  persist(
    (set, get) => ({
      cards: [],
      xp: 0,
      streak: 0,
      lastDay: null,
      tipSeen: false,
      ...EMPTY_SYNC,
      addWords: (suggestions) => {
        const known = new Set(get().cards.map((card) => card.id));
        const now = Date.now();
        const added = suggestions
          .filter((item) => item.word.trim() && item.translation.trim())
          .map((item) => newCard(item, now))
          .filter((card) => {
            if (known.has(card.id)) return false;
            known.add(card.id);
            return true;
          });
        if (added.length) set((state) => ({ cards: [...added, ...state.cards] }));
        return added.length;
      },
      removeWord: (id) =>
        set((state) => ({ cards: state.cards.filter((card) => card.id !== id), removed: { ...state.removed, [id]: Date.now() } })),
      reviewWord: (id, correct) =>
        set((state) => ({ cards: state.cards.map((card) => (card.id === id ? review(card, correct, Date.now()) : card)) })),
      finishRound: (xp) =>
        set((state) => {
          const now = Date.now();
          return { xp: state.xp + xp, streak: streakAfterRound(state.streak, state.lastDay, now), lastDay: dayKey(now) };
        }),
      markTipSeen: () => set({ tipSeen: true }),
      applyRemote: (incoming, deleted, { cursor, pushedAt }) =>
        set((state) => {
          const byId = new Map(state.cards.map((card) => [card.id, card]));
          for (const id of deleted) {
            const local = byId.get(id);
            if (local && (local.updatedAt ?? local.addedAt) <= pushedAt) byId.delete(id);
          }
          for (const card of incoming) {
            const local = byId.get(card.id);
            if (!local || (local.updatedAt ?? local.addedAt) < (card.updatedAt ?? 0)) byId.set(card.id, { ...card, addedAt: local?.addedAt ?? card.addedAt });
          }
          const removed = Object.fromEntries(Object.entries(state.removed).filter(([, time]) => time > pushedAt));
          const cards = [...byId.values()].sort((a, b) => b.addedAt - a.addedAt);
          return { cards, removed, cursor, pushedAt };
        }),
      setXp: (xp) => set({ xp }),
      clear: () => set({ cards: [], xp: 0, streak: 0, lastDay: null, ...EMPTY_SYNC }),
    }),
    { name: 'vocabulary', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

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
