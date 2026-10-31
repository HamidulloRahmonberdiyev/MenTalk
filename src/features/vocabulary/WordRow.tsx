import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import type { VocabCard } from '@/types';

import { masteryStyle } from './masteryStyle';
import { MAX_STAGE, masteryOf } from './srs';
import { SpeakerButton } from './SpeakerButton';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface WordRowProps {
  card: VocabCard;
  onRemove: (id: string) => void;
}

export function WordRow({ card, onRemove }: WordRowProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const mastery = masteryStyle(home)[masteryOf(card.stage)];
  const [confirming, setConfirming] = useState(false);
  /** The row is removed only after the sheet has slid away; removing it first would cut the sheet off. */
  const removeWhenClosed = useRef(false);

  return (
    <Card style={styles.card}>
      <SpeakerButton text={card.word} size={44} />
      <View style={styles.texts}>
        <AppText variant="subheading" numberOfLines={1}>
          {card.word}
        </AppText>
        <AppText color={home.textSecondary} numberOfLines={1}>
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
      <PressableScale accessibilityRole="button" accessibilityLabel={t('words.remove')} hitSlop={10}
        onPress={() => {
          haptics.light();
          setConfirming(true);
        }}
      >
        <Ionicons name="trash-outline" size={20} color={home.textMuted} />
      </PressableScale>
      <ConfirmSheet
        visible={confirming}
        icon="trash-outline"
        title={t('words.removeTitle')}
        message={`${card.word} — ${card.translation}`}
        confirmLabel={t('words.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          removeWhenClosed.current = true;
          haptics.success();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
        onClosed={() => {
          if (removeWhenClosed.current) onRemove(card.id);
        }}
      />
    </Card>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  chipText: { fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: home.rim },
});
