import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useT, type Translate } from '@/i18n';
import type { ApiNotebookMistake } from '@/services/api/endpoints';
import { useScenario } from '@/store/scenariosStore';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { usePalette } from '@/theme/appearance';

import { categoryOf } from './categories';

const DAY_MS = 86_400_000;
/** Past this, "N days ago" stops meaning much and the date says it better. */
const MAX_DAYS = 30;

/** "today", "yesterday", "3 days ago" by calendar day on this phone, or the date when long ago. */
export function whenMade(iso: string, t: Translate, now: Date = new Date()): string {
  const made = new Date(iso);
  const midnight = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((midnight(now) - midnight(made)) / DAY_MS);
  if (days <= 0) return t('mistakes.context.today');
  if (days === 1) return t('mistakes.context.yesterday');
  if (days <= MAX_DAYS) return t('mistakes.context.daysAgo', { n: days });
  return made.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Which mistake this is: its kind, the chat it came from, when, and how often it was made. Shown
 * above every lesson and drill, so the learner always knows what they are working on.
 */
export function MistakeContext({ mistake, align = 'center' }: { mistake: ApiNotebookMistake; align?: 'center' | 'start' }) {
  const t = useT();
  const home = usePalette();
  const language = useSettingsStore((state) => state.language);
  const scenario = useScenario(mistake.scenario_id ?? undefined);
  const category = categoryOf(mistake.category);
  const where = scenario ? t('mistakes.context.in', { topic: scenario.title[language] }) : t('mistakes.context.chat');

  return (
    <View style={[styles.root, align === 'start' && styles.start]}>
      <View style={[styles.topic, { backgroundColor: `${category.tint}1F` }]}>
        <Ionicons name={category.icon} size={13} color={category.tint} />
        <AppText variant="captionStrong" color={category.tint}>
          {t(category.label)}
        </AppText>
      </View>
      {mistake.occurrences > 1 ? (
        <View style={[styles.topic, { backgroundColor: home.dangerFill }]}>
          <Ionicons name="repeat" size={13} color={home.dangerInk} />
          <AppText variant="captionStrong" color={home.dangerInk}>
            {t('mistakes.context.times', { n: mistake.occurrences })}
          </AppText>
        </View>
      ) : null}
      <AppText variant="caption" color={home.textMuted} numberOfLines={1} style={styles.where}>
        {where} · {whenMade(mistake.last_seen_at, t)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  start: { justifyContent: 'flex-start' },
  topic: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  where: { flexShrink: 1 },
});
