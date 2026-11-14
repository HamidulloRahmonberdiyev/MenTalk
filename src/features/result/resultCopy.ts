import type { TranslationKey } from '@/i18n';
import type { IconName, MetricId } from '@/types';

/** One bright colour per skill, with a darker edge for its chunky icon chip (Duolingo blue, green, purple). */
export const METRIC_META: Record<MetricId, { label: TranslationKey; icon: IconName; color: string; edge: string }> = {
  speech: { label: 'result.metric.speech', icon: 'chatbubble-ellipses', color: '#1CB0F6', edge: '#1899D6' },
  vocabulary: { label: 'result.metric.vocabulary', icon: 'book', color: '#58CC02', edge: '#58A700' },
  grammar: { label: 'result.metric.grammar', icon: 'document-text', color: '#CE82FF', edge: '#A568CC' },
};

export function getVerdict(score: number): { title: TranslationKey; subtitle: TranslationKey } {
  if (score >= 8) return { title: 'result.high.title', subtitle: 'result.high.subtitle' };
  if (score >= 5) return { title: 'result.mid.title', subtitle: 'result.mid.subtitle' };
  return { title: 'result.low.title', subtitle: 'result.low.subtitle' };
}

/** `204` → `3:24`. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
