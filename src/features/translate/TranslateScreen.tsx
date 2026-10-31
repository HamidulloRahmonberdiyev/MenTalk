import { Ionicons } from '@expo/vector-icons';

import { StatusBar } from 'expo-status-bar';
import { Fragment } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_SPACE } from '@/components/navigation/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useRefreshControl } from '@/components/ui/useRefreshControl';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

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
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const translator = useTranslator();
  const { refreshControl, version } = useRefreshControl();
  const { result, status, text } = translator;
  const typed = text.trim().length > 0;

  const speakResult = async () => {
    if (!result) return;
    const started = await translator.speak(result.translation, result.targetLanguage);
    if (!started) Alert.alert(t('translate.noVoice'));
  };

  return (
    <View style={styles.root}>
      <StatusBar style={home.statusBar} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title" color={home.text} accessibilityRole="header">
          {t('translate.title')}
        </AppText>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_SPACE + insets.bottom + spacing.xl }]}
        refreshControl={refreshControl}
      >
        <Fragment key={version}>
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
              <AppText variant="caption" color={home.textMuted} style={styles.flex}>
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
              <AppText variant="caption" color={home.textMuted}>
                {t('translate.didYouMean')}
              </AppText>
              <AppText variant="captionStrong" color={home.accent} style={styles.flex}>
                {result.correctedInput}
              </AppText>
              <Ionicons name="arrow-forward" size={16} color={home.accent} />
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
                  <AppText variant="bodyStrong" color={home.text} style={styles.flex}>
                    {t(ERROR_KEYS[translator.error])}
                  </AppText>
                  <Button title={t('translate.retry')} onPress={translator.retry} style={styles.retry} />
                </Animated.View>
              ) : null}

              {result && !translator.stale ? <ResultDetails result={result} onPick={(value) => void translator.copy(value)} /> : null}
            </>
          ) : (
            <HistoryPanel onPick={translator.reuse} />
          )}
        </Fragment>
      </ScrollView>
    </View>
  );
}

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
    content: { padding: spacing.xl, gap: spacing.lg },
    flex: { flex: 1 },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.warningFill,
    },
    suggest: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: home.selected,
    },
    error: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.dangerRim,
      backgroundColor: home.dangerFill,
    },
    retry: { height: 44, borderRadius: radii.md },
  });
