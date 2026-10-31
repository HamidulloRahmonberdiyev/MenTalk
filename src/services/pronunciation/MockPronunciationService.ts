import type { Language } from '@/i18n';

import { deleteRecording } from './tempAudio';
import { alignWords, wordsOf, type AssessRequest, type PronunciationResult, type PronunciationService } from './types';

const TIP: Record<Language, { problem: string; howTo: string }> = {
  uz: { problem: 'Bu so‘zdagi tovush noaniq chiqdi.', howTo: 'Sekinroq ayting: avval tovushni alohida, keyin butun so‘zni.' },
  ru: { problem: 'Звук в этом слове получился нечётким.', howTo: 'Скажите медленнее: сначала звук отдельно, потом всё слово.' },
  en: { problem: 'A sound in this word came out unclear.', howTo: 'Say it slower: the sound on its own first, then the whole word.' },
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Offline stand-in: plausible scores that differ per word, so the screen can be built without a backend. */
export class MockPronunciationService implements PronunciationService {
  async assess({ audioUri, reference, uiLanguage }: AssessRequest): Promise<PronunciationResult> {
    try {
      await delay(900);
      const scored = wordsOf(reference).map((word) => {
        const hash = [...word].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 997, 7);
        return { word, score: 45 + ((hash + Date.now()) % 56) };
      });
      const words = alignWords(reference, scored);
      const worst = [...words].filter((word) => word.verdict !== 'good').sort((a, b) => a.score - b.score).slice(0, 2);
      return {
        score: Math.round(words.reduce((sum, word) => sum + word.score, 0) / Math.max(1, words.length)),
        words,
        tips: worst.map(({ word }) => ({ word, ...TIP[uiLanguage] })),
        // The mock has no dictionary to translate with, so nothing is offered for the word list.
        newWords: [],
      };
    } finally {
      deleteRecording(audioUri);
    }
  }
}
