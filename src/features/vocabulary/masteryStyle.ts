import type { TranslationKey } from '@/i18n';
import type { Palette } from '@/theme/appearance';

import type { Mastery } from './srs';

type MasteryStyle = Record<Mastery, { color: string; soft: string; label: TranslationKey }>;

const LABELS: Record<Mastery, TranslationKey> = {
  new: 'words.mastery.new',
  learning: 'words.mastery.learning',
  known: 'words.mastery.known',
  mastered: 'words.mastery.mastered',
};

/** Ink and fill per mastery step; the dark look uses brighter inks on translucent fills. */
export function masteryStyle(palette: Palette): MasteryStyle {
  const dark = palette.appearance === 'dark';
  return {
    new: { color: palette.textSecondary, soft: palette.track, label: LABELS.new },
    learning: dark ? { color: '#FFB547', soft: '#FFB54726', label: LABELS.learning } : { color: '#B45309', soft: '#FEF3C7', label: LABELS.learning },
    known: { color: palette.accent, soft: palette.primarySoft, label: LABELS.known },
    mastered: dark ? { color: '#4ADE80', soft: '#4ADE8026', label: LABELS.mastered } : { color: '#0F7A4B', soft: '#E3F8EE', label: LABELS.mastered },
  };
}
