import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import type { StudyLanguage } from '@/services/learning';
import { verdictOf, type PronunciationResult, type PronunciationTip, type WordVerdict } from '@/services/pronunciation';
import { speakText } from '@/services/speech';
import { radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { WordSuggestion } from '@/types';

import { SavedWordsCard } from './SavedWordsCard';
import { VERDICT_INK, VERDICT_SOLID, verdictFill } from './verdictColors';

const VERDICTS: readonly WordVerdict[] = ['good', 'fair', 'bad'];

function headlineKey(score: number) {
  if (score >= 85) return 'pron.score.great' as const;
  if (score >= 65) return 'pron.score.good' as const;
  return 'pron.score.low' as const;
}

function TipCard({ tip, verdict, language, index }: { tip: PronunciationTip; verdict: WordVerdict; language: StudyLanguage; index: number }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const say = (rate?: number) => {
    haptics.selection();
    void speakText(tip.word, language, { rate });
  };

  return (
    <Animated.View entering={FadeInDown.delay(250 + index * 120).springify().damping(16)} style={[styles.tip, { borderLeftColor: VERDICT_SOLID[verdict] }]}>
      <View style={styles.tipHead}>
        <View style={[styles.wordChip, { backgroundColor: verdictFill(verdict, home) }]}>
          <AppText variant="bodyStrong" color={VERDICT_INK[verdict]}>
            {tip.word}
          </AppText>
        </View>
        {tip.sound ? (
          <View style={styles.sound}>
            <AppText variant="captionStrong" color={home.textSecondary}>
              /{tip.sound}/
            </AppText>
          </View>
        ) : null}
        <View style={styles.flex} />
        <Pressable3D accessibilityRole="button" accessibilityLabel={t('pron.listen')} onPress={() => say()} edgeColor="#1A84BF" depth={3} radius={radii.pill} faceStyle={styles.round}>
          <Ionicons name="volume-high" size={18} color="#FFFFFF" />
        </Pressable3D>
        <Pressable3D accessibilityRole="button" accessibilityLabel={t('pron.slow')} onPress={() => say(0.5)} edgeColor={home.rimBottom} depth={3} radius={radii.pill} faceStyle={[styles.round, styles.roundSoft]}>
          <AppText style={styles.turtle}>🐢</AppText>
        </Pressable3D>
      </View>
      <AppText variant="body" color={home.text}>
        {tip.problem}
      </AppText>
      <View style={styles.howTo}>
        <Ionicons name="bulb" size={18} color="#E5A100" />
        <AppText variant="body" color={home.textSecondary} style={styles.flex}>
          {tip.howTo}
        </AppText>
      </View>
    </Animated.View>
  );
}

interface ResultPanelProps {
  result: PronunciationResult;
  language: StudyLanguage;
  saved: readonly WordSuggestion[];
  onUnsave: (word: string) => void;
}

/** Overall score, a word count per colour, the one or two mistakes that matter most, and the words saved for later. */
export function ResultPanel({ result, language, saved, onUnsave }: ResultPanelProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const verdict = verdictOf(result.score);
  const counts = VERDICTS.map((key) => result.words.filter((word) => word.verdict === key).length);
  const verdictByWord = new Map(result.words.map((word) => [word.word.toLocaleLowerCase(), word.verdict]));

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.summary}>
        <CircularProgress value={result.score / 100} size={86} strokeWidth={9} color={VERDICT_SOLID[verdict]}>
          <AppText variant="heading" color={VERDICT_INK[verdict]}>
            {result.score}
          </AppText>
        </CircularProgress>
        <View style={styles.summaryText}>
          <AppText variant="subheading" color={home.text}>
            {t(headlineKey(result.score))}
          </AppText>
          <View style={styles.legend}>
            {VERDICTS.map((key, index) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: VERDICT_SOLID[key] }]} />
                <AppText variant="captionStrong" color={home.textSecondary}>
                  {counts[index]} {t(`pron.legend.${key}`)}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {result.tips.length > 0 ? (
        <>
          <AppText variant="captionStrong" color={home.textMuted} style={styles.section}>
            {t('pron.tips').toUpperCase()}
          </AppText>
          {result.tips.map((tip, index) => (
            <TipCard key={`${tip.word}-${index}`} tip={tip} verdict={verdictByWord.get(tip.word.toLocaleLowerCase()) ?? 'bad'} language={language} index={index} />
          ))}
        </>
      ) : (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.perfect}>
          <AppText style={styles.party}>🎉</AppText>
          <AppText variant="bodyStrong" color={home.successInk} style={styles.flex}>
            {t('pron.noTips')}
          </AppText>
        </Animated.View>
      )}

      <SavedWordsCard words={saved} onRemove={onUnsave} delay={350 + result.tips.length * 120} />
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { gap: spacing.md },
    flex: { flex: 1 },
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    summaryText: { flex: 1, gap: spacing.sm },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: 4 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    section: { letterSpacing: 0.8, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
    tip: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderLeftWidth: 6,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    tipHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    wordChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.sm },
    sound: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, backgroundColor: home.track },
    round: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2AABEE' },
    roundSoft: { borderWidth: 2, borderColor: home.rim, backgroundColor: home.panel },
    turtle: { fontSize: 16, lineHeight: 20 },
    howTo: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: home.warningFill },
    perfect: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: home.successFill,
    },
    party: { fontSize: 26, lineHeight: 32 },
  });
