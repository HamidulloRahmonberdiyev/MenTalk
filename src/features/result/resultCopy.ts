import type { TranslationKey } from '@/i18n';
import { colors } from '@/theme';
import type { IconName, MetricId } from '@/types';

export const METRIC_META: Record<MetricId, { label: TranslationKey; icon: IconName; color: string }> = {
  speech: { label: 'result.metric.speech', icon: 'chatbubble-ellipses', color: colors.primary },
  vocabulary: { label: 'result.metric.vocabulary', icon: 'book', color: colors.success },
  grammar: { label: 'result.metric.grammar', icon: 'document-text', color: colors.purple },
};

export function getVerdict(score: number): { title: TranslationKey; subtitle: TranslationKey } {
  if (score >= 8) return { title: 'result.high.title', subtitle: 'result.high.subtitle' };
  if (score >= 5) return { title: 'result.mid.title', subtitle: 'result.mid.subtitle' };
  return { title: 'result.low.title', subtitle: 'result.low.subtitle' };
}
