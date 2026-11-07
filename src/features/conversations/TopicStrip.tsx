import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScenarioThumb } from '@/components/ui/ScenarioThumb';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import type { PathStage } from '../path/path';
import { usePath } from '../path/usePath';
import { openConversation } from '../scenarios/navigation';

const STAR = '#FFC800';

/** The topics on offer in the studied language. A locked one leads to the path, which says what opens it. */
export function TopicStrip() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const language = useSettingsStore((state) => state.language);
  const stages = usePath();

  const open = ({ scenario, status }: PathStage) => {
    haptics.selection();
    if (status === 'locked') router.push('/scenarios');
    else openConversation(scenario.id);
  };

  if (!stages.length) return null;

  return (
    <View style={styles.root}>
      <View style={styles.headingRow}>
        <AppText variant="heading" color={home.text} accessibilityRole="header">
          {t('home.menu.topics')}
        </AppText>
        <PressableScale accessibilityRole="link" onPress={() => router.push('/scenarios')} hitSlop={8} style={styles.more}>
          <Ionicons name="chevron-forward" size={20} color={home.accent} />
        </PressableScale>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {stages.map((stage) => {
          const locked = stage.status === 'locked';
          const next = stage.status === 'open';
          return (
            <PressableScale
              key={stage.scenario.id}
              accessibilityRole="button"
              accessibilityLabel={stage.scenario.title[language]}
              accessibilityState={{ disabled: locked }}
              onPress={() => open(stage)}
              style={[styles.card, next && styles.cardNext]}
            >
              <View style={[styles.top, locked && styles.locked]}>
                <ScenarioThumb scenario={stage.scenario} size={52} />
                {stage.status === 'passed' ? (
                  <View style={styles.stars}>
                    {[0, 1, 2].map((index) => (
                      <Ionicons key={index} name="star" size={13} color={index < stage.stars ? STAR : home.rim} />
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={locked && styles.locked}>
                <AppText variant="bodyStrong" color={home.text} numberOfLines={1}>
                  {stage.scenario.title[language]}
                </AppText>
                <AppText variant="caption" color={home.textMuted} numberOfLines={2} style={styles.subtitle}>
                  {stage.scenario.subtitle[language]}
                </AppText>
              </View>
              {next ? (
                <View style={styles.chip}>
                  <Ionicons name="play" size={11} color={colors.onPrimary} />
                  <AppText variant="captionStrong" color={colors.onPrimary} style={styles.chipText}>
                    {t('conversations.next')}
                  </AppText>
                </View>
              ) : null}
              {locked ? (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={14} color={home.textMuted} />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    // Runs to the screen edges, past the padding of the list it sits in.
    root: { gap: spacing.md, marginHorizontal: -spacing.xl },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
    },
    more: {
      width: 32,
      height: 32,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.primarySoft,
    },
    list: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xs },
    card: {
      width: 160,
      minHeight: 168,
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    // The next stage on the path stands out with the brand rim.
    cardNext: {
      borderColor: colors.primary,
      borderBottomColor: colors.primaryDark,
      backgroundColor: home.selected,
    },
    top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    stars: { flexDirection: 'row', gap: 1 },
    locked: { opacity: 0.45 },
    subtitle: { marginTop: 2 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: 'auto',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
    },
    chipText: { fontSize: 12 },
    lock: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 26,
      height: 26,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.track,
    },
  });
