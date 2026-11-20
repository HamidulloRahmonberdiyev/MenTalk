import type { TranslationKey } from '@/i18n';
import type { MistakeCategory } from '@/services/api/endpoints';
import type { IconName } from '@/types';

interface CategoryStyle {
  label: TranslationKey;
  icon: IconName;
  tint: string;
  /**
   * The rule behind this kind of mistake, with examples. Written for Russian under the key and
   * overridden for English under `key@en` (see `useT`). "Other" has none: it says nothing.
   */
  rule: TranslationKey | null;
}

export const CATEGORIES: Record<MistakeCategory, CategoryStyle> = {
  verb_form: { label: 'mistakes.cat.verb_form', icon: 'time', tint: '#7C5CFF', rule: 'mistakes.rule.verb_form' },
  case_ending: { label: 'mistakes.cat.case_ending', icon: 'layers', tint: '#1CB0F6', rule: 'mistakes.rule.case_ending' },
  agreement: { label: 'mistakes.cat.agreement', icon: 'link', tint: '#00A389', rule: 'mistakes.rule.agreement' },
  word_order: { label: 'mistakes.cat.word_order', icon: 'swap-horizontal', tint: '#FF9600', rule: 'mistakes.rule.word_order' },
  preposition: { label: 'mistakes.cat.preposition', icon: 'navigate', tint: '#E5484D', rule: 'mistakes.rule.preposition' },
  article: { label: 'mistakes.cat.article', icon: 'text', tint: '#CE82FF', rule: 'mistakes.rule.article' },
  pronoun: { label: 'mistakes.cat.pronoun', icon: 'person', tint: '#58CC02', rule: 'mistakes.rule.pronoun' },
  word_choice: { label: 'mistakes.cat.word_choice', icon: 'chatbubble-ellipses', tint: '#E5A100', rule: 'mistakes.rule.word_choice' },
  spelling: { label: 'mistakes.cat.spelling', icon: 'create', tint: '#FF4B91', rule: 'mistakes.rule.spelling' },
  other: { label: 'mistakes.cat.other', icon: 'ellipsis-horizontal', tint: '#8B98A8', rule: null },
};

export const categoryOf = (category: string): CategoryStyle => CATEGORIES[category as MistakeCategory] ?? CATEGORIES.other;
