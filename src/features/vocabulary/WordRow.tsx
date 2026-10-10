import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import type { VocabCard } from '@/types';

import { MASTERY_STYLE } from './masteryStyle';
import { MAX_STAGE, masteryOf } from './srs';
import { SpeakerButton } from './SpeakerButton';

interface WordRowProps {
  card: VocabCard;
  onRemove: (id: string) => void;
}

export function WordRow({ card, onRemove }: WordRowProps) {
  const t = useT();
  const mastery = MASTERY_STYLE[masteryOf(card.stage)];

  const confirmRemove = () => {
    haptics.light();
    Alert.alert(t('words.remove'), `${card.word} — ${card.translation}`, [
      { text: t('common.back'), style: 'cancel' },
      { text: t('words.remove'), style: 'destructive', onPress: () => onRemove(card.id) },
    ]);
  };

  return (
    <Card style={styles.card}>
      <SpeakerButton text={card.word} size={44} />
      <View style={styles.texts}>
        <AppText variant="subheading" numberOfLines={1}>
          {card.word}
        </AppText>
        <AppText color={colors.textSecondary} numberOfLines={1}>
          {card.translation}
        </AppText>
        <View style={styles.meta}>
          <View style={[styles.chip, { backgroundColor: mastery.soft }]}>
            <AppText variant="caption" color={mastery.color} style={styles.chipText}>
              {t(mastery.label)}
            </AppText>
          </View>
          <View style={styles.dots} accessibilityElementsHidden>
            {Array.from({ length: MAX_STAGE }, (_, index) => (
              <View key={index} style={[styles.dot, index < card.stage && { backgroundColor: mastery.color }]} />
            ))}
          </View>
        </View>
      </View>
      <PressableScale accessibilityRole="button" accessibilityLabel={t('words.remove')} hitSlop={10} onPress={confirmRemove}>
        <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
      </PressableScale>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  chipText: { fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
});
