import type { TranslationKey } from '@/i18n';
import type { MistakeCategory } from '@/services/api/endpoints';
import type { IconName } from '@/types';

interface CategoryStyle {
  label: TranslationKey;
  icon: IconName;
  tint: string;
}

export const CATEGORIES: Record<MistakeCategory, CategoryStyle> = {
  verb_form: { label: 'mistakes.cat.verb_form', icon: 'time', tint: '#7C5CFF' },
  case_ending: { label: 'mistakes.cat.case_ending', icon: 'layers', tint: '#1CB0F6' },
  agreement: { label: 'mistakes.cat.agreement', icon: 'link', tint: '#00A389' },
  word_order: { label: 'mistakes.cat.word_order', icon: 'swap-horizontal', tint: '#FF9600' },
  preposition: { label: 'mistakes.cat.preposition', icon: 'navigate', tint: '#E5484D' },
  article: { label: 'mistakes.cat.article', icon: 'text', tint: '#CE82FF' },
  pronoun: { label: 'mistakes.cat.pronoun', icon: 'person', tint: '#58CC02' },
  word_choice: { label: 'mistakes.cat.word_choice', icon: 'chatbubble-ellipses', tint: '#E5A100' },
  spelling: { label: 'mistakes.cat.spelling', icon: 'create', tint: '#FF4B91' },
  other: { label: 'mistakes.cat.other', icon: 'ellipsis-horizontal', tint: '#8B98A8' },
};

export const categoryOf = (category: string): CategoryStyle => CATEGORIES[category as MistakeCategory] ?? CATEGORIES.other;
