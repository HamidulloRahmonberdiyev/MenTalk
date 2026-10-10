import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, spacing } from '@/theme';
import type { WordSuggestion } from '@/types';

import { SpeakerButton } from './SpeakerButton';
import { findCard, useVocabularyStore } from './vocabularyStore';

/** After a chat: the words worth learning from it, each one tap away from the word game. */
export function NewWordsCard({ words }: { words: WordSuggestion[] }) {
  const t = useT();
  const cards = useVocabularyStore((state) => state.cards);
  const addWords = useVocabularyStore((state) => state.addWords);
  const unsaved = words.filter((item) => !findCard(cards, item.word));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headTexts}>
          <AppText variant="heading" accessibilityRole="header">
            {t('result.newWords')}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('result.newWords.hint')}
          </AppText>
        </View>
        {unsaved.length > 1 ? (
          <PressableScale
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              addWords(unsaved);
              haptics.success();
            }}
          >
            <AppText variant="bodyStrong" color={colors.primary}>
              {t('result.addAll')}
            </AppText>
          </PressableScale>
        ) : null}
      </View>

      {words.map((item) => {
        const saved = findCard(cards, item.word) !== undefined;
        return (
          <Card key={item.word} style={styles.row}>
            <SpeakerButton text={item.form ?? item.word} size={40} />
            <View style={styles.texts}>
              <AppText variant="subheading">{item.word}</AppText>
              <AppText color={colors.textSecondary}>{item.translation}</AppText>
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={saved ? t('result.wordAdded') : t('word.save')}
              disabled={saved}
              hitSlop={10}
              onPress={() => {
                addWords([item]);
                haptics.success();
              }}
            >
              <Ionicons
                name={saved ? 'checkmark-circle' : 'add-circle-outline'}
                size={30}
                color={saved ? colors.success : colors.primary}
              />
            </PressableScale>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headTexts: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
});
