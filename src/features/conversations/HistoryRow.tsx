import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ScenarioThumb } from '@/components/ui/ScenarioThumb';
import { useT } from '@/i18n';
import { SCENARIO_MAP } from '@/mocks/scenarios';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, shadows, spacing } from '@/theme';
import type { HistoryEntry } from '@/types';

const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' } as const;

export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const scenario = SCENARIO_MAP[entry.scenarioId];
  const date = new Date(entry.date).toLocaleDateString(LOCALES[language], { day: 'numeric', month: 'long' });
  const minutes = t('common.minutes', { n: Math.max(1, Math.round(entry.durationSec / 60)) });

  return (
    <View style={styles.row}>
      <ScenarioThumb scenario={scenario} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong">{t(`scenario.${scenario.id}.title`)}</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {date} · {minutes}
        </AppText>
      </View>
      <View style={styles.score}>
        <AppText variant="captionStrong" color={colors.primary}>
          {entry.score}/10
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  texts: { flex: 1, gap: 2 },
  score: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
});
