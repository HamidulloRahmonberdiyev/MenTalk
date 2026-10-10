import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { speakText, stopSpeaking } from '@/services/speech';
import { colors, radii, shadows, spacing } from '@/theme';

import { useWordLookup, type WordRequest } from './useWordLookup';
import { findCard, useVocabularyStore } from './vocabularyStore';

interface WordSheetProps {
  /** The tapped word, or null while the sheet is closed. */
  request: WordRequest | null;
  onClose: () => void;
}

/** Bottom sheet that translates a tapped word and lets the learner save it for the word game. */
export function WordSheet({ request, onClose }: WordSheetProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const lookup = useWordLookup(request);
  const cards = useVocabularyStore((state) => state.cards);
  const addWords = useVocabularyStore((state) => state.addWords);
  const markTipSeen = useVocabularyStore((state) => state.markTipSeen);

  useEffect(() => {
    if (request) markTipSeen();
    else stopSpeaking();
  }, [request, markTipSeen]);

  const result = lookup.status === 'ready' ? lookup.word : null;
  const isSaved = result ? findCard(cards, result.word) !== undefined : false;
  const shownWord = result?.word ?? request?.word.toLowerCase() ?? '';

  return (
    <Modal visible={request !== null} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('practice.close')} />
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}
        >
          <View style={styles.grabber} />
          <View style={styles.wordRow}>
            <AppText variant="title" style={styles.word}>
              {shownWord}
            </AppText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('word.listen')}
              hitSlop={8}
              onPress={() => {
                haptics.light();
                void speakText(shownWord, 'ru');
              }}
              style={styles.speaker}
            >
              <Ionicons name="volume-medium" size={22} color={colors.primary} />
            </PressableScale>
          </View>

          {lookup.status === 'loading' ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.primary} />
              <AppText color={colors.textSecondary}>{t('word.loading')}</AppText>
            </View>
          ) : null}

          {lookup.status === 'error' ? (
            <View style={styles.gap}>
              <AppText color={colors.danger}>{t('word.error')}</AppText>
              <Button title={t('common.retry')} variant="soft" icon="refresh" onPress={lookup.retry} />
            </View>
          ) : null}

          {result ? (
            <View style={styles.gap}>
              <AppText variant="heading" color={colors.primaryDark}>
                {result.translation}
              </AppText>
              {result.example ? (
                <AppText color={colors.textSecondary} style={styles.example}>
                  «{result.example}»
                </AppText>
              ) : null}
              <Button
                title={isSaved ? t('word.saved') : t('word.save')}
                icon={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
                variant={isSaved ? 'soft' : 'primary'}
                disabled={isSaved}
                onPress={() => {
                  addWords([result]);
                  haptics.success();
                }}
              />
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14, 27, 44, 0.45)' },
  sheet: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  word: { flex: 1 },
  speaker: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  gap: { gap: spacing.md },
  example: { fontStyle: 'italic' },
});
