import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { radii, spacing } from '@/theme';
import type { VocabCard as Card } from '@/types';

const RADIUS = 34;
const FACE = ['#3EC0FF', '#1A9DF2'] as const;
const EDGE = '#0E7FD0';
const PILL = '#0A78C8';
const INK = '#1E2A5C';
/** Shown on the flashcard until the learner saves a word of their own. */
const SAMPLE_TRANSLATION = { uz: 'o‘qituvchi', ru: 'учитель', en: 'someone who teaches' } as const;

interface VocabCardProps {
  cards: readonly Card[];
  due: number;
  onPress: () => void;
}

/** "My dictionary" on the home sheet: bright blue, a word-count pill and a fanned stack of flashcards. */
export function VocabCard({ cards, due, onPress }: VocabCardProps) {
  const t = useT();
  const latest = cards.reduce<Card | undefined>((last, card) => (!last || card.addedAt > last.addedAt ? card : last), undefined);
  const language = useSettingsStore((state) => state.language);
  const front = latest ?? { word: 'teacher', translation: SAMPLE_TRANSLATION[language], example: 'A teacher inspires students.' };
  const label = cards.length ? t('home.vocab.count', { n: cards.length, due }) : t('home.vocab.empty');

  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={`${t('home.vocab.title')}. ${label}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={EDGE}
      depth={6}
      radius={RADIUS}
    >
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.stack} pointerEvents="none">
          <View style={[styles.flash, styles.flashBack]}>
            <AppText color="rgba(30,42,92,0.5)" style={styles.flashTag}>
              [verb]
            </AppText>
          </View>
          <View style={[styles.flash, styles.flashMiddle]}>
            <AppText color={INK} style={styles.flashNumber}>
              024
            </AppText>
          </View>
          <View style={[styles.flash, styles.flashFront]}>
            <View style={styles.flashHead}>
              <AppText color={INK} style={styles.flashNumber}>
                {String(Math.max(cards.length, 1)).padStart(3, '0')}
              </AppText>
              <AppText color="rgba(30,42,92,0.5)" style={styles.flashTag}>
                [word]
              </AppText>
            </View>
            <AppText color={INK} numberOfLines={1} style={styles.flashWord}>
              {front.word}
            </AppText>
            <AppText color="rgba(30,42,92,0.6)" numberOfLines={1} style={styles.flashTranslation}>
              {front.translation}
            </AppText>
            {front.example ? (
              <View style={styles.flashExample}>
                <AppText color="rgba(30,42,92,0.6)" numberOfLines={2} style={styles.flashExampleText}>
                  {front.example}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
          {t('home.vocab.title')}
        </AppText>

        <View style={styles.pill}>
          <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.pillText}>
            {label}
          </AppText>
        </View>

        <View style={styles.arrow}>
          <Ionicons name="arrow-up" size={26} color={INK} style={styles.arrowIcon} />
        </View>
      </LinearGradient>
    </Pressable3D>
  );
}

const FLASH_W = 150;
const FLASH_H = 140;

const styles = StyleSheet.create({
  card: {
    minHeight: 196,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    justifyContent: 'space-between',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  title: {
    marginRight: 64,
    fontSize: 46,
    lineHeight: 56,
    fontWeight: '900',
    letterSpacing: -1,
  },
  pill: {
    alignSelf: 'flex-start',
    maxWidth: '58%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: PILL,
  },
  pillText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  arrow: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  arrowIcon: { transform: [{ rotate: '45deg' }] },

  stack: {
    position: 'absolute',
    right: -20,
    bottom: -40,
    width: FLASH_W + 90,
    height: FLASH_H + 20,
  },
  flash: {
    position: 'absolute',
    width: FLASH_W,
    height: FLASH_H,
    padding: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  flashBack: {
    right: -40,
    top: 30,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(200, 230, 255, 0.55)',
    transform: [{ rotate: '8deg' }],
  },
  flashMiddle: {
    left: 0,
    top: 34,
    backgroundColor: 'rgba(200, 230, 255, 0.6)',
    transform: [{ rotate: '-10deg' }],
  },
  flashFront: {
    left: 40,
    top: 6,
    gap: 2,
    backgroundColor: 'rgba(214, 236, 255, 0.92)',
    boxShadow: '0 6px 16px rgba(10, 60, 120, 0.25)',
    transform: [{ rotate: '-4deg' }],
  },
  flashHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flashNumber: { fontSize: 12, lineHeight: 16, fontWeight: '800', fontStyle: 'italic' },
  flashTag: { fontSize: 10, lineHeight: 14, fontStyle: 'italic' },
  flashWord: { fontSize: 18, lineHeight: 23, fontWeight: '900', fontStyle: 'italic', textTransform: 'capitalize' },
  flashTranslation: { fontSize: 11, lineHeight: 14, fontWeight: '600', fontStyle: 'italic' },
  flashExample: {
    marginTop: 4,
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  flashExampleText: { fontSize: 8, lineHeight: 11, fontStyle: 'italic' },
});
