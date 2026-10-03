import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';

import { HistoryPanel } from './HistoryPanel';
import { LanguageBar } from './LanguageBar';
import { ResultCard } from './ResultCard';
import { ResultDetails } from './ResultDetails';
import { ResultSkeleton } from './ResultSkeleton';
import { TranslatorInput } from './TranslatorInput';
import { useTranslator } from './useTranslator';

const ERROR_KEYS = { network: 'notice.network', quota: 'notice.quota', failed: 'notice.turnFailed' } as const;

export function TranslateScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const translator = useTranslator();
  const { result, status, text } = translator;
  const typed = text.trim().length > 0;

  const speakResult = async () => {
    if (!result) return;
    const started = await translator.speak(result.translation, result.targetLanguage);
    if (!started) Alert.alert(t('translate.noVoice'));
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.primarySoft, colors.background]} style={styles.glow} pointerEvents="none" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl },
        ]}
      >
        <AppText variant="title" accessibilityRole="header">
          {t('translate.title')}
        </AppText>

        <LanguageBar
          source={translator.source}
          target={translator.target}
          detected={result?.sourceLanguage}
          uzScript={translator.uzScript}
          onChange={translator.setLanguages}
          onSwap={translator.swap}
          onUzScript={translator.setUzScript}
        />

        <TranslatorInput
          value={text}
          onChangeText={translator.changeText}
          listening={translator.listening}
          micLevel={translator.micLevel}
          onMic={translator.toggleMic}
          onPaste={translator.paste}
          onClear={translator.clear}
        />

        {!translator.configured ? (
          <View style={styles.banner}>
            <Ionicons name="key-outline" size={20} color={colors.warning} />
            <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
              {t('translate.noKey')}
            </AppText>
          </View>
        ) : null}

        {result?.correctedInput && result.correctedInput !== text.trim() ? (
          <PressableScale
            accessibilityRole="button"
            onPress={() => translator.changeText(result.correctedInput)}
            style={styles.suggest}
          >
            <AppText variant="caption" color={colors.textSecondary}>
              {t('translate.didYouMean')}
            </AppText>
            <AppText variant="captionStrong" color={colors.primaryDark} style={styles.flex}>
              {result.correctedInput}
            </AppText>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </PressableScale>
        ) : null}

        {typed && translator.configured ? (
          <>
            {result ? (
              <ResultCard
                result={result}
                stale={translator.stale}
                speaking={translator.speaking}
                copied={translator.copied}
                favorite={translator.favorite}
                onSpeak={speakResult}
                onCopy={() => void translator.copy(result.translation)}
                onShare={() => translator.share(result.translation)}
                onToggleFavorite={translator.toggleFavorite}
              />
            ) : status === 'loading' ? (
              <ResultSkeleton />
            ) : null}

            {status === 'error' && translator.error ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
                <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
                <AppText variant="bodyStrong" style={styles.flex}>
                  {t(ERROR_KEYS[translator.error])}
                </AppText>
                <Button title={t('translate.retry')} onPress={translator.retry} variant="soft" style={styles.retry} />
              </Animated.View>
            ) : null}

            {result && !translator.stale ? <ResultDetails result={result} onPick={(value) => void translator.copy(value)} /> : null}
          </>
        ) : (
          <HistoryPanel onPick={translator.reuse} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  flex: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: '#FFF6E5',
  },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: '#FDECEC',
  },
  retry: { height: 40, paddingHorizontal: spacing.md, borderRadius: radii.pill },
});
