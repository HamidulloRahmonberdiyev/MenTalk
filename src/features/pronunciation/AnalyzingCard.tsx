import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT, type TranslationKey } from '@/i18n';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

const STEPS: readonly { key: TranslationKey; after: number }[] = [
  { key: 'pron.step.upload', after: 0 },
  { key: 'pron.step.words', after: 700 },
  { key: 'pron.step.tips', after: 1900 },
];

function Bar({ width }: { width: `${number}%` }) {
  const styles = useThemedStyles(createStyles);
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.get() * 0.45 }));
  return <Animated.View style={[styles.bar, { width }, style]} />;
}

/** Shown while the recording is being scored: the stages tick off so the wait feels short, over a skeleton of the result. */
export function AnalyzingCard() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const [reached, setReached] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, index) => setTimeout(() => setReached(index + 1), step.after));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.card} accessibilityLiveRegion="polite" accessibilityLabel={t('pron.analyzing')}>
      <AppText variant="subheading" color={home.text}>
        {t('pron.analyzing')}
      </AppText>
      <View style={styles.steps}>
        {STEPS.map((step, index) => {
          const done = index < reached;
          const active = index === reached;
          return (
            <View key={step.key} style={[styles.step, !done && !active && styles.pending]}>
              <View style={[styles.mark, done && styles.markDone]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : active ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.idleDot} />
                )}
              </View>
              <AppText variant={active ? 'bodyStrong' : 'body'} color={done ? home.textMuted : home.text}>
                {t(step.key)}
              </AppText>
            </View>
          );
        })}
      </View>
      <View style={styles.skeleton}>
        <Bar width="72%" />
        <Bar width="94%" />
        <Bar width="58%" />
      </View>
    </Animated.View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    steps: { gap: spacing.sm },
    step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    pending: { opacity: 0.45 },
    mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    markDone: { backgroundColor: '#58CC02' },
    idleDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: home.rim },
    skeleton: { gap: 10, marginTop: spacing.xs },
    bar: { height: 12, borderRadius: 6, backgroundColor: home.track },
  });
