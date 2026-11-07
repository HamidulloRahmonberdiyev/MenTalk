import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { HistoryEntry } from '@/types';

import { FeatureCard } from '../home/FeatureCard';
import { usePath } from '../path/usePath';
import { openConversation } from '../scenarios/navigation';
import { HistoryRow } from './HistoryRow';
import { TopicStrip } from './TopicStrip';

const LOCALES = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' } as const;
const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (time: number) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** History split into days, newest first, each under "Today", "Yesterday" or its date. */
function useDays(history: HistoryEntry[]) {
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  // Taken once per mount: the tab remounts often enough for "Today" to stay right.
  const [today] = useState(() => startOfDay(Date.now()));
  return useMemo(() => {
    const days: { key: number; label: string; entries: HistoryEntry[] }[] = [];
    for (const entry of [...history].sort((a, b) => b.date - a.date)) {
      const key = startOfDay(entry.date);
      let day = days[days.length - 1];
      if (day?.key !== key) {
        const label =
          key === today
            ? t('conversations.today')
            : key === today - DAY
              ? t('conversations.yesterday')
              : new Date(key).toLocaleDateString(LOCALES[language], { day: 'numeric', month: 'long' });
        day = { key, label, entries: [] };
        days.push(day);
      }
      day.entries.push(entry);
    }
    return days;
  }, [history, language, t, today]);
}

export function ConversationsScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { refreshControl, version } = useRefreshControl();
  const history = useUserStore((state) => state.history);
  const days = useDays(history);

  const average = history.length ? history.reduce((sum, entry) => sum + entry.score, 0) / history.length : 0;
  const minutes = Math.round(history.reduce((sum, entry) => sum + entry.durationSec, 0) / 60);
  const lastScenarioId = useUserStore((state) => state.lastScenarioId);
  const stages = usePath();
  // Same as "Continue" on home: the open stage of the path, or the last talk once it is all passed.
  const startNext = () => {
    const next = stages.find((stage) => stage.status === 'open')?.scenario.id ?? lastScenarioId ?? stages[0]?.scenario.id;
    if (next) openConversation(next);
    else router.push('/scenarios');
  };

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title" color={home.text} accessibilityRole="header">
          {t('conversations.title')}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
          <FeatureCard
            title={t('home.talk.title')}
            icon="mic"
            gradient={['#6FA8E8', '#2F6DBF']}
            edge="#24508F"
            stats={[
              { label: t('home.talk.sessions'), value: history.length },
              { label: t('home.talk.average'), value: history.length ? average.toFixed(1) : 0 },
              { label: t('conversations.stat.minutes'), value: minutes },
            ]}
            onPress={startNext}
          />

          <TopicStrip />

          {history.length ? (
            <View style={styles.section}>
              <AppText variant="heading" color={home.text} accessibilityRole="header">
                {t('conversations.history')}
              </AppText>
              {days.map((day) => (
                <View key={day.key} style={styles.day}>
                  <AppText variant="captionStrong" color={home.textMuted} style={styles.dayLabel}>
                    {day.label}
                  </AppText>
                  <View style={styles.group}>
                    {day.entries.map((entry, index) => (
                      <Fragment key={entry.id}>
                        {index ? <View style={styles.divider} /> : null}
                        <HistoryRow entry={entry} />
                      </Fragment>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.badge}>
                <Ionicons name="chatbubbles" size={34} color={colors.onPrimary} />
              </View>
              <AppText variant="heading" color={home.text} style={styles.center}>
                {t('conversations.emptyTitle')}
              </AppText>
              <AppText color={home.textMuted} style={[styles.center, styles.text]}>
                {t('conversations.emptyText')}
              </AppText>
              <Button title={t('home.start')} icon="mic" onPress={() => router.push('/scenarios')} style={styles.button} />
            </View>
          )}
        </Fragment>
      </ScrollView>
    </View>
  );
}

const panel = (home: Palette) => ({
  borderRadius: radii.lg,
  borderWidth: 2,
  borderBottomWidth: 5,
  borderColor: home.rim,
  borderBottomColor: home.rimBottom,
  backgroundColor: home.panel,
});

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    // Same bar as the other tabs.
    header: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
      backgroundColor: home.header,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: home.divider,
    },
    content: { gap: spacing.xxl, padding: spacing.xl },
    section: { gap: spacing.md },
    day: { gap: spacing.sm },
    dayLabel: { paddingHorizontal: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 12 },
    // One card per day with hairlines between talks reads calmer than a stack of outlined boxes.
    group: { ...panel(home), overflow: 'hidden' },
    divider: { height: StyleSheet.hairlineWidth, marginLeft: 76, backgroundColor: home.divider },
    empty: {
      ...panel(home),
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xxl,
      borderRadius: radii.xl,
      borderBottomWidth: 6,
    },
    badge: {
      width: 76,
      height: 76,
      marginBottom: spacing.sm,
      borderRadius: radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderBottomWidth: 5,
      borderBottomColor: '#1A84BF',
    },
    center: { textAlign: 'center' },
    text: { marginBottom: spacing.md },
    button: { alignSelf: 'stretch' },
  });
