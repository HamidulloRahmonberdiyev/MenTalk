import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette } from '@/theme/appearance';
import { enter } from '@/theme/motion';

import type { Drill } from './drills';
import { MistakeExplanation } from './MistakeExplanation';
import { SentenceDiff } from './SentenceDiff';
import type { DrillAnswer } from './useMistakeDrill';

/** The explanation may be long; past this share of the screen it scrolls, the button stays put. */
const MAX_BODY_SHARE = 0.42;

/**
 * After every answer, right or wrong: the right sentence with the fix picked out, what exactly
 * changed, and why. A right answer is reinforced, a wrong one is never left as just "wrong".
 */
export function DrillFeedback({ drill, answer, onContinue }: { drill: Drill; answer: DrillAnswer; onContinue: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const home = usePalette();
  const good = answer.correct;
  const tone = good ? { bg: home.successFill, fg: home.successInk, accent: colors.success } : { bg: home.dangerFill, fg: home.dangerInk, accent: colors.danger };
  const { said, correct } = drill.mistake;

  return (
    <Animated.View
      entering={enter.slideUp()}
      style={[styles.bar, { backgroundColor: tone.bg, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Ionicons name={good ? 'checkmark-circle' : 'close-circle'} size={30} color={tone.accent} />
        <AppText variant="heading" color={tone.fg} style={styles.flex}>
          {good ? t('practice.correct') : t('practice.wrong')}
        </AppText>
      </View>

      <ScrollView style={{ maxHeight: height * MAX_BODY_SHARE }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SentenceDiff said={said} correct={correct} side="correct" variant="subheading" />
        <MistakeExplanation mistake={drill.mistake} mode="brief" />
      </ScrollView>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('practice.continue')}
        onPress={() => {
          haptics.light();
          onContinue();
        }}
        style={[styles.button, { backgroundColor: tone.accent }]}
      >
        <AppText variant="button" color={colors.onPrimary}>
          {t('practice.continue')}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  body: { gap: spacing.md },
  button: { height: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
