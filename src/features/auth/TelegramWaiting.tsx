import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT, type TranslationKey } from '@/i18n';
import type { TelegramAttempt } from '@/services/auth';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

export type TelegramStage = 'waiting' | 'opened' | 'done';

const STEPS: readonly { key: TranslationKey; doneFrom: number }[] = [
  { key: 'auth.wait.step.open', doneFrom: 1 },
  { key: 'auth.wait.step.confirm', doneFrom: 2 },
  { key: 'auth.wait.step.return', doneFrom: 2 },
];

const STAGE_INDEX: Record<TelegramStage, number> = { waiting: 0, opened: 1, done: 2 };

/** The three steps of a Telegram sign-in, ticked off as the bot reports back, and the time left. */
export function TelegramWaiting({ stage, attempt }: { stage: TelegramStage; attempt: TelegramAttempt }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const reached = STAGE_INDEX[stage];

  return (
    <View style={styles.root}>
      <View style={styles.card} accessibilityRole="list">
        {STEPS.map(({ key, doneFrom }, index) => {
          const done = reached >= doneFrom;
          const active = !done && index === reached;
          return (
            <View key={key} style={[styles.row, index < STEPS.length - 1 && styles.rowRule]} accessibilityRole="text" accessibilityState={{ checked: done, busy: active }}>
              <View style={[styles.dot, done ? styles.dotDone : active ? styles.dotActive : styles.dotIdle]}>
                {done ? (
                  <Animated.View entering={ZoomIn.springify().damping(14)}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </Animated.View>
                ) : active ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <AppText variant="captionStrong" color={home.textMuted}>
                    {index + 1}
                  </AppText>
                )}
              </View>
              <AppText variant="bodyStrong" color={done ? home.textSecondary : active ? home.text : home.textMuted} style={styles.label}>
                {t(key)}
              </AppText>
            </View>
          );
        })}
      </View>

      {stage === 'done' ? (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.pill, styles.pillDone]}>
          <ActivityIndicator size="small" color={home.successInk} />
          <AppText variant="captionStrong" color={home.successInk}>
            {t('auth.wait.done')}
          </AppText>
        </Animated.View>
      ) : (
        <Countdown expiresAt={attempt.expiresAt} />
      )}
    </View>
  );
}

function Countdown({ expiresAt }: { expiresAt: number }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.round((expiresAt - now) / 1_000));
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const low = seconds < 60;

  return (
    <View style={[styles.pill, low ? styles.pillLow : styles.pillCalm]} accessibilityLiveRegion="none">
      <Ionicons name="time-outline" size={15} color={low ? home.dangerInk : home.accent} />
      <AppText variant="captionStrong" color={low ? home.dangerInk : home.accent} style={styles.tabular}>
        {t('auth.wait.expires', { time })}
      </AppText>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { gap: spacing.lg, alignItems: 'center' },
    card: {
      alignSelf: 'stretch',
      paddingHorizontal: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
    rowRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: home.divider },
    dot: { width: 34, height: 34, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
    dotDone: { backgroundColor: colors.success },
    dotActive: { borderWidth: 2, borderColor: colors.primary, backgroundColor: home.primaryTint },
    dotIdle: { borderWidth: 2, borderColor: home.rim },
    label: { flex: 1 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radii.pill },
    pillCalm: { backgroundColor: home.primarySoft },
    pillLow: { backgroundColor: home.dangerFill },
    pillDone: { backgroundColor: home.successFill },
    tabular: { fontVariant: ['tabular-nums'] },
  });
