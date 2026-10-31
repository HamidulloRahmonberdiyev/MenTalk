import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ScenarioThumb } from '@/components/ui/ScenarioThumb';
import { useT } from '@/i18n';
import { SCENARIO_MAP } from '@/mocks/scenarios';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { HistoryEntry } from '@/types';

const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' } as const;

/** Green for a strong talk, orange for a fair one, red for one to redo. */
const scoreTint = (score: number) => (score >= 8 ? '#58CC02' : score >= 5 ? '#FF9600' : '#FF4B4B');

export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const language = useSettingsStore((state) => state.language);
  const scenario = SCENARIO_MAP[entry.scenarioId];
  const date = new Date(entry.date).toLocaleDateString(LOCALES[language], { day: 'numeric', month: 'long' });
  const minutes = t('common.minutes', { n: Math.max(1, Math.round(entry.durationSec / 60)) });
  const tint = scoreTint(entry.score);

  return (
    <View style={styles.row}>
      <ScenarioThumb scenario={scenario} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" color={home.text} numberOfLines={1}>
          {t(`scenario.${scenario.id}.title`)}
        </AppText>
        <AppText variant="caption" color={home.textMuted}>
          {date} · {minutes}
        </AppText>
      </View>
      <View style={[styles.score, { backgroundColor: `${tint}22`, borderColor: `${tint}66` }]}>
        <AppText variant="captionStrong" color={tint}>
          {entry.score}/10
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    texts: { flex: 1, gap: 2 },
    score: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      borderWidth: 1.5,
    },
  });
