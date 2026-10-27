import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import type { IconName } from '@/types';

import { playableCards, type GameMode } from './exercises';
import { countDue, useVocabularyStore } from './vocabularyStore';

/** A game needs this many playable words: one answer and at least two wrong options. */
const MIN_WORDS = 3;

interface Game {
  mode: GameMode;
  icon: IconName;
  tint: string;
  title: TranslationKey;
  text: TranslationKey;
  /** Why the game is closed when too few words suit it. */
  locked: TranslationKey;
}

const GAMES: readonly Game[] = [
  { mode: 'mixed', icon: 'sparkles', tint: colors.primary, title: 'game.mixed.title', text: 'game.mixed.text', locked: 'game.locked.words' },
  { mode: 'choice', icon: 'bulb-outline', tint: '#2E90FA', title: 'game.choice.title', text: 'game.choice.text', locked: 'game.locked.words' },
  { mode: 'reverse', icon: 'swap-horizontal', tint: colors.purple, title: 'game.reverse.title', text: 'game.reverse.text', locked: 'game.locked.words' },
  { mode: 'listen', icon: 'headset-outline', tint: colors.success, title: 'game.listen.title', text: 'game.listen.text', locked: 'game.locked.words' },
  { mode: 'cloze', icon: 'document-text-outline', tint: colors.warning, title: 'game.cloze.title', text: 'game.cloze.text', locked: 'game.locked.examples' },
  { mode: 'spell', icon: 'grid-outline', tint: '#E0569B', title: 'game.spell.title', text: 'game.spell.text', locked: 'game.locked.spell' },
];

export const gameOf = (mode: GameMode): Game => GAMES.find((game) => game.mode === mode) ?? GAMES[0];

interface GamePickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Where every word game starts: the learner picks the kind of game they enjoy. The game opens
 * after the sheet has slid away, so the two motions never overlap.
 */
export function GamePickerSheet({ visible, onClose }: GamePickerSheetProps) {
  const t = useT();
  const cards = useVocabularyStore((state) => state.cards);
  const lastMode = useVocabularyStore((state) => state.lastMode);
  const setLastMode = useVocabularyStore((state) => state.setLastMode);
  const chosen = useRef<GameMode | null>(null);

  const counts = useMemo(() => new Map(GAMES.map(({ mode }) => [mode, playableCards(cards, mode).length])), [cards]);
  const due = countDue(cards);

  const pick = (mode: GameMode) => {
    haptics.medium();
    chosen.current = mode;
    setLastMode(mode);
    onClose();
  };

  const startChosen = () => {
    const mode = chosen.current;
    chosen.current = null;
    if (mode) router.push({ pathname: '/practice', params: { mode } });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} onClosed={startChosen} closeLabel={t('practice.close')} style={styles.sheet}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          {t('game.pick')}
        </AppText>
        <AppText color={colors.textSecondary}>{due > 0 ? t('words.due', { n: due }) : t('words.bonus')}</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {GAMES.map((game) => {
          const count = counts.get(game.mode) ?? 0;
          const ready = count >= MIN_WORDS;
          const featured = game.mode === 'mixed';
          return (
            <PressableScale
              key={game.mode}
              accessibilityRole="button"
              accessibilityLabel={`${t(game.title)}. ${ready ? t(game.text) : t(game.locked)}`}
              accessibilityState={{ disabled: !ready }}
              disabled={!ready}
              onPress={() => pick(game.mode)}
              style={[styles.row, featured && styles.rowFeatured, !ready && styles.rowOff]}
            >
              <IconTile
                icon={game.icon}
                tint={game.tint}
                size={48}
                gradient={featured ? [colors.primaryLight, colors.primaryDark] : undefined}
              />
              <View style={styles.texts}>
                <View style={styles.titleRow}>
                  <AppText variant="subheading" numberOfLines={1} style={styles.title}>
                    {t(game.title)}
                  </AppText>
                  {ready && game.mode === lastMode ? <Badge label={t('game.last')} tint={game.tint} /> : null}
                  {ready && featured && lastMode !== 'mixed' ? <Badge label={t('game.recommended')} tint={game.tint} /> : null}
                </View>
                <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                  {ready ? t(game.text) : t(game.locked)}
                </AppText>
              </View>
              {ready ? (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              ) : (
                <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
              )}
            </PressableScale>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

function Badge({ label, tint }: { label: string; tint: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${tint}1F` }]}>
      <AppText variant="caption" color={tint} style={styles.badgeText}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: '88%' },
  header: { gap: spacing.xs },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowFeatured: { borderColor: colors.primarySoft, backgroundColor: colors.primaryTint },
  rowOff: { opacity: 0.55 },
  texts: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flexShrink: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  badgeText: { fontWeight: '700' },
});
