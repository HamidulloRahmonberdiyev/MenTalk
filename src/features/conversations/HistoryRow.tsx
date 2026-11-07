import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ScenarioThumb } from '@/components/ui/ScenarioThumb';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useScenario } from '@/store/scenariosStore';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { HistoryEntry } from '@/types';

import { openConversation } from '../scenarios/navigation';

/** Green for a strong talk, orange for a fair one, red for one to redo. */
const scoreTint = (score: number) => (score >= 8 ? '#58CC02' : score >= 5 ? '#FF9600' : '#FF4B4B');

/** One past talk; tapping it starts the same topic again. */
export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const language = useSettingsStore((state) => state.language);
  const scenario = useScenario(entry.scenarioId);
  const time = new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const minutes = t('common.minutes', { n: Math.max(1, Math.round(entry.durationSec / 60)) });
  const tint = scoreTint(entry.score);
  const title = scenario?.title[language] ?? t('conversations.pastTopic');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${entry.score}/10`}
      disabled={!scenario}
      onPress={() => {
        haptics.selection();
        openConversation(entry.scenarioId);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ScenarioThumb scenario={scenario} size={48} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" color={home.text} numberOfLines={1}>
          {title}
        </AppText>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={13} color={home.textMuted} />
          <AppText variant="caption" color={home.textMuted}>
            {time} · {minutes}
          </AppText>
        </View>
      </View>
      <View style={[styles.score, { backgroundColor: `${tint}1F` }]}>
        <AppText variant="bodyStrong" color={tint} style={styles.scoreValue}>
          {entry.score}
        </AppText>
        <AppText variant="caption" color={tint} style={styles.scoreMax}>
          /10
        </AppText>
      </View>
    </Pressable>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    pressed: { backgroundColor: home.primaryTint },
    texts: { flex: 1, gap: 2 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    score: {
      flexDirection: 'row',
      alignItems: 'baseline',
      minWidth: 56,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: 14,
    },
    scoreValue: { fontSize: 18, fontWeight: '800' },
    scoreMax: { fontSize: 11, opacity: 0.8 },
  });
