import { create } from 'zustand';

import type { ConversationResult } from '@/types';

interface ResultState {
  result: ConversationResult | null;
  setResult: (result: ConversationResult) => void;
  clear: () => void;
}

export const useResultStore = create<ResultState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
