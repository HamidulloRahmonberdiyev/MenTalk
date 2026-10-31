import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { AnalyzingCard } from './AnalyzingCard';
import { PhraseCard } from './PhraseCard';
import { PHRASE_LEVELS } from './phrases';
import { RecordDock } from './RecordDock';
import { ResultPanel } from './ResultPanel';
import { usePronunciation, type PracticeError } from './usePronunciation';

const ERROR_ICON: Record<PracticeError, keyof typeof Ionicons.glyphMap> = {
  denied: 'mic-off',
  noSpeech: 'volume-mute',
  failed: 'cloud-offline',
};

/** Read a line aloud, get every word coloured by how well it was said, and the one or two fixes that matter. */
export function PronunciationScreen() {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const studyLanguage = useSettingsStore((state) => state.studyLanguage);
  const practice = usePronunciation();
  const { phase, error, result } = practice;

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('pron.title')} onBack={() => router.back()} style={styles.header} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.levels} accessibilityRole="radiogroup">
          {PHRASE_LEVELS.map((level) => {
            const selected = practice.level === level;
            return (
              <Pressable
                key={level}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  if (selected) return;
                  haptics.selection();
                  practice.setLevel(level);
                }}
                style={[styles.level, selected && styles.levelSelected]}
              >
                <AppText variant="captionStrong" color={selected ? home.accent : home.textSecondary}>
                  {t(`pron.level.${level}`)}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel={t('pron.next')} hitSlop={8} onPress={practice.next} style={styles.shuffle}>
            <Ionicons name="shuffle" size={20} color={home.accent} />
          </Pressable>
        </View>

        <PhraseCard phrase={practice.phrase} language={studyLanguage} words={result?.words ?? null} scanning={phase === 'analyzing'} />

        {phase === 'analyzing' ? <AnalyzingCard /> : null}
        {phase === 'result' && result ? <ResultPanel result={result} language={studyLanguage} saved={practice.saved} onUnsave={practice.unsave} /> : null}
        {phase === 'error' && error ? (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.error}>
            <Ionicons name={ERROR_ICON[error]} size={24} color={home.dangerInk} />
            <View style={styles.flex}>
              <AppText variant="body" color={home.dangerInk}>
                {t(`pron.error.${error}`)}
              </AppText>
              {error === 'denied' ? (
                <AppText variant="bodyStrong" color={home.accent} onPress={() => void Linking.openSettings()}>
                  {t('pron.openSettings')}
                </AppText>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
        {phase === 'ready' ? (
          <View style={styles.legend}>
            <Ionicons name="information-circle" size={18} color={home.textMuted} />
            <AppText variant="caption" color={home.textMuted} style={styles.flex}>
              {t('pron.howItWorks')}
            </AppText>
          </View>
        ) : null}
      </ScrollView>
      <RecordDock phase={phase} level={practice.micLevel} onMic={practice.toggleRecording} onNext={practice.next} />
    </Screen>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    header: { paddingHorizontal: spacing.lg },
    content: { gap: spacing.lg, padding: spacing.xl, paddingTop: spacing.md },
    flex: { flex: 1 },
    levels: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    level: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderBottomWidth: 4,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    levelSelected: { borderColor: colors.primary, borderBottomColor: '#1A84BF', backgroundColor: home.selected },
    shuffle: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: home.primarySoft },
    error: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: home.dangerRim,
      backgroundColor: home.dangerFill,
    },
    legend: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs },
  });
