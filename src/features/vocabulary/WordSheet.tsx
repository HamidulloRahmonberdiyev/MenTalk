import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { speakText, stopSpeaking } from '@/services/speech';
import { useStudyLanguage } from '@/store/settingsStore';
import { colors, radii, spacing } from '@/theme';

import { useWordLookup, type WordRequest } from './useWordLookup';
import { findCard, useStudyCards, useVocabularyStore } from './vocabularyStore';

interface WordSheetProps {
  /** The tapped word, or null while the sheet is closed. */
  request: WordRequest | null;
  onClose: () => void;
}

/** Bottom sheet that translates a tapped word and lets the learner save it for the word game. */
export function WordSheet({ request, onClose }: WordSheetProps) {
  const t = useT();
  // The last word stays on the sheet while it slides away.
  const [shown, setShown] = useState(request);
  if (request && request !== shown) setShown(request);
  const lookup = useWordLookup(shown);
  const cards = useStudyCards();
  const { id: studyLanguage } = useStudyLanguage();
  const addWords = useVocabularyStore((state) => state.addWords);
  const markTipSeen = useVocabularyStore((state) => state.markTipSeen);

  useEffect(() => {
    if (request) markTipSeen();
    else stopSpeaking();
  }, [request, markTipSeen]);

  const result = lookup.status === 'ready' ? lookup.word : null;
  const isSaved = result ? findCard(cards, result.word) !== undefined : false;
  const shownWord = result?.word ?? shown?.word.toLowerCase() ?? '';

  return (
    <BottomSheet visible={request !== null} onClose={onClose} closeLabel={t('practice.close')}>
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
                void speakText(shownWord, studyLanguage);
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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
