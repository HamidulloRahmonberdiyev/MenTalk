import type { TranslationKey } from '@/i18n';
import { colors } from '@/theme';

import type { Mastery } from './srs';

export const MASTERY_STYLE: Record<Mastery, { color: string; soft: string; label: TranslationKey }> = {
  new: { color: colors.textSecondary, soft: '#EEF2F6', label: 'words.mastery.new' },
  learning: { color: '#B45309', soft: '#FEF3C7', label: 'words.mastery.learning' },
  known: { color: colors.primaryDark, soft: colors.primarySoft, label: 'words.mastery.known' },
  mastered: { color: '#0F7A4B', soft: '#E3F8EE', label: 'words.mastery.mastered' },
};
