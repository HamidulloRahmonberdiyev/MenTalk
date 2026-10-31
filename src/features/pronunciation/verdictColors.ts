import type { WordVerdict } from '@/services/pronunciation';
import type { Palette } from '@/theme/appearance';

/** Duolingo-like traffic lights: ink for text, solid for badges, fill for a word's highlight. */
export const VERDICT_INK: Record<WordVerdict, string> = { good: '#46A302', fair: '#D98E04', bad: '#E53838' };
export const VERDICT_SOLID: Record<WordVerdict, string> = { good: '#58CC02', fair: '#FFB020', bad: '#FF4B4B' };

export function verdictFill(verdict: WordVerdict, home: Palette): string {
  const dark = home.appearance === 'dark';
  switch (verdict) {
    case 'good':
      return dark ? 'rgba(88, 204, 2, 0.16)' : '#E9F9DA';
    case 'fair':
      return dark ? 'rgba(255, 176, 32, 0.18)' : '#FFF4D6';
    case 'bad':
      return dark ? 'rgba(255, 75, 75, 0.18)' : '#FFE4E4';
  }
}
