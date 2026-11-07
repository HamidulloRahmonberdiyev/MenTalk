import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
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
import { SentenceDiff } from './SentenceDiff';
import type { DrillAnswer } from './useMistakeDrill';

/** After every answer: the right sentence with the fix picked out, and the tutor's note on why. */
export function DrillFeedback({ drill, answer, onContinue }: { drill: Drill; answer: DrillAnswer; onContinue: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const home = usePalette();
  const good = answer.correct;
  const tone = good ? { bg: home.successFill, fg: home.successInk, accent: colors.success } : { bg: home.dangerFill, fg: home.dangerInk, accent: colors.danger };
  const { said, correct, note } = drill.mistake;

  return (
    <Animated.View
      entering={enter.slideUp()}
      style={[styles.bar, { backgroundColor: tone.bg, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Ionicons name={good ? 'checkmark-circle' : 'close-circle'} size={30} color={tone.accent} />
        <View style={styles.texts}>
          <AppText variant="heading" color={tone.fg}>
            {good ? t('practice.correct') : t('practice.wrong')}
          </AppText>
          <SentenceDiff said={said} correct={correct} side="correct" variant="subheading" />
          {note ? (
            <AppText variant="caption" color={tone.fg}>
              {note}
            </AppText>
          ) : null}
        </View>
      </View>
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
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  texts: { flex: 1, gap: spacing.xs },
  button: { height: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
});
