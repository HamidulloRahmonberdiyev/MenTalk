import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import type { ScannedWord } from './scanDemo';

const SHOWN = 6;

interface ScanSavedProps {
  words: ScannedWord[];
  onOpenWords: () => void;
  onAgain: () => void;
}

/** The success sheet: a check that pops, the saved words as chips, and where to go next. */
export function ScanSaved({ words, onOpenWords, onAgain }: ScanSavedProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const ring = useSharedValue(0);

  useEffect(() => {
    ring.set(withDelay(150, withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 0 }))));
  }, [ring]);

  const burst = useAnimatedStyle(() => ({
    opacity: ring.get() === 0 ? 0 : 1 - ring.get(),
    transform: [{ scale: 1 + ring.get() * 0.9 }],
  }));

  const rest = words.length - SHOWN;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.badgeWrap}>
        <Animated.View style={[styles.burst, burst]} />
        <Animated.View entering={ZoomIn.springify().damping(11).delay(80)} style={styles.badge}>
          <Ionicons name="checkmark" size={44} color="#FFFFFF" />
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.delay(220).duration(320)} style={styles.texts}>
        <AppText color={home.text} style={styles.title}>
          {t('scan.saved.title')}
        </AppText>
        <AppText color={home.textMuted} style={styles.text}>
          {t('scan.saved.text', { n: words.length })}
        </AppText>
      </Animated.View>

      <View style={styles.chips}>
        {words.slice(0, SHOWN).map((word, index) => (
          <Animated.View key={word.id} entering={ZoomIn.delay(320 + index * 60).springify().damping(14)} style={styles.chip}>
            <AppText color={home.accent} style={styles.chipText}>
              {word.lemma}
            </AppText>
          </Animated.View>
        ))}
        {rest > 0 && (
          <Animated.View entering={ZoomIn.delay(320 + SHOWN * 60)} style={[styles.chip, styles.chipMore]}>
            <AppText color={home.textMuted} style={styles.chipText}>
              +{rest}
            </AppText>
          </Animated.View>
        )}
      </View>

      <Animated.View entering={FadeInUp.delay(450).duration(320)} style={styles.actions}>
        <Button title={t('scan.saved.words')} icon="book" onPress={onOpenWords} />
        <Button title={t('scan.again')} variant="soft" icon="scan" onPress={onAgain} />
      </Animated.View>
    </Animated.View>
  );
}

const BADGE = 84;

const createStyles = (home: Palette) =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      gap: spacing.lg,
      paddingTop: spacing.xxxl,
      paddingHorizontal: spacing.xl,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      backgroundColor: home.panel,
      boxShadow: '0 -12px 32px rgba(0, 0, 0, 0.35)',
    },
    badgeWrap: { width: BADGE, height: BADGE, alignItems: 'center', justifyContent: 'center' },
    burst: { position: 'absolute', width: BADGE, height: BADGE, borderRadius: BADGE / 2, backgroundColor: colors.success },
    badge: {
      width: BADGE,
      height: BADGE,
      borderRadius: BADGE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.success,
      borderBottomWidth: 5,
      borderBottomColor: '#178A57',
      boxShadow: '0 10px 24px rgba(34, 181, 115, 0.4)',
    },
    texts: { alignItems: 'center', gap: 6 },
    title: { fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
    text: { fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: home.primarySoft,
    },
    chipMore: { backgroundColor: home.track },
    chipText: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
    actions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.sm },
  });
