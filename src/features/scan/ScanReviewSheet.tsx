import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT, type Language, type TranslationKey } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import type { ScannedWord } from './scanDemo';

interface ScanReviewSheetProps {
  words: ScannedWord[];
  selected: ReadonlySet<string>;
  language: Language;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onRetake: () => void;
  onSave: () => void;
}

/**
 * What the scan found, as a sheet over the photo: every word with its reading, part of speech, level
 * and translation. New words start picked, ones already in the word list are shown but locked.
 */
export function ScanReviewSheet({ words, selected, language, onToggle, onToggleAll, onRetake, onSave }: ScanReviewSheetProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const fresh = words.filter((word) => !word.known);
  const known = words.length - fresh.length;
  const allPicked = fresh.every((word) => selected.has(word.id));
  const count = selected.size;

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.handle} />

      <View style={styles.head}>
        <View style={styles.headTexts}>
          <AppText color={home.text} style={styles.title}>
            {t('scan.found', { n: words.length })}
          </AppText>
          <View style={styles.subRow}>
            <AppText color={home.textMuted} style={styles.sub}>
              English → {t('scan.target')}
            </AppText>
            {known > 0 && (
              <>
                <View style={styles.dot} />
                <AppText color={home.successInk} style={styles.sub}>
                  {t('scan.knownCount', { n: known })}
                </AppText>
              </>
            )}
          </View>
        </View>
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            haptics.selection();
            onToggleAll();
          }}
          style={styles.allPill}
        >
          <Ionicons name={allPicked ? 'remove-circle-outline' : 'checkmark-done'} size={16} color={home.accent} />
          <AppText color={home.accent} style={styles.allText}>
            {allPicked ? t('scan.selectNone') : t('scan.selectAll')}
          </AppText>
        </PressableScale>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {words.map((word, index) => (
          <Animated.View key={word.id} entering={FadeInDown.delay(80 + index * 45).duration(320)} layout={LinearTransition}>
            <WordRow word={word} picked={selected.has(word.id)} language={language} onToggle={onToggle} />
          </Animated.View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale accessibilityRole="button" onPress={onRetake} style={styles.retake} hitSlop={6}>
          <Ionicons name="camera-reverse-outline" size={22} color={home.textSecondary} />
        </PressableScale>
        <Button
          title={count > 0 ? t('scan.save', { n: count }) : t('scan.saveNone')}
          icon="bookmark"
          disabled={count === 0}
          onPress={onSave}
          style={styles.save}
        />
      </View>
    </View>
  );
}

interface WordRowProps {
  word: ScannedWord;
  picked: boolean;
  language: Language;
  onToggle: (id: string) => void;
}

function WordRow({ word, picked, language, onToggle }: WordRowProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const locked = !!word.known;

  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled: locked }}
      accessibilityLabel={`${word.lemma}, ${word.translation[language]}`}
      disabled={locked}
      scaleTo={0.98}
      onPress={() => {
        haptics.selection();
        onToggle(word.id);
      }}
      style={[styles.row, picked && styles.rowPicked, locked && styles.rowLocked]}
    >
      <View style={[styles.check, picked && styles.checkOn, locked && styles.checkKnown]}>
        {(picked || locked) && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
      </View>

      <View style={styles.rowTexts}>
        <View style={styles.wordLine}>
          <AppText color={home.text} style={styles.word} numberOfLines={1}>
            {word.lemma}
          </AppText>
          <AppText color={home.textMuted} style={styles.ipa} numberOfLines={1}>
            /{word.transcription}/
          </AppText>
        </View>
        <AppText color={home.textSecondary} style={styles.translation} numberOfLines={1}>
          {word.translation[language]}
        </AppText>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <AppText color={home.textMuted} style={styles.tagText}>
              {t(`scan.pos.${word.pos}` as TranslationKey)}
            </AppText>
          </View>
          <View style={[styles.tag, styles.levelTag]}>
            <AppText color={home.accent} style={styles.tagText}>
              {word.level}
            </AppText>
          </View>
          {locked && (
            <View style={[styles.tag, styles.knownTag]}>
              <AppText color={home.successInk} style={styles.tagText}>
                {t('scan.known')}
              </AppText>
            </View>
          )}
        </View>
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t('translate.speak')}
        hitSlop={8}
        scaleTo={0.85}
        onPress={() => {
          haptics.light();
          Speech.stop();
          Speech.speak(word.lemma, { language: 'en-US', rate: 0.9 });
        }}
        style={styles.speak}
      >
        <Ionicons name="volume-medium" size={18} color={home.accent} />
      </PressableScale>
    </PressableScale>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: '64%',
      paddingTop: spacing.sm,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      backgroundColor: home.panel,
      boxShadow: '0 -12px 32px rgba(0, 0, 0, 0.35)',
    },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: home.handle, marginBottom: spacing.md },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
    headTexts: { flex: 1, gap: 2 },
    title: { fontSize: 20, lineHeight: 26, fontWeight: '900', letterSpacing: -0.3 },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sub: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: home.textMuted },
    allPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.pill,
      backgroundColor: home.primarySoft,
    },
    allText: { fontSize: 13, lineHeight: 17, fontWeight: '800' },
    list: { flexGrow: 0, flexShrink: 1 },
    listContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    rowPicked: { borderColor: colors.primary, backgroundColor: home.selected },
    rowLocked: { opacity: 0.72 },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: home.rimBottom,
    },
    checkOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    checkKnown: { borderColor: colors.success, backgroundColor: colors.success },
    rowTexts: { flex: 1, gap: 3 },
    wordLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    word: { flexShrink: 1, fontSize: 17, lineHeight: 22, fontWeight: '800' },
    ipa: { flexShrink: 1, fontSize: 13, lineHeight: 17 },
    translation: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
    tags: { flexDirection: 'row', gap: 5, marginTop: 2 },
    tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: home.track },
    levelTag: { backgroundColor: home.primarySoft },
    knownTag: { backgroundColor: home.successFill },
    tagText: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', letterSpacing: 0.3 },
    speak: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.primarySoft,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: home.divider,
    },
    retake: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.track,
    },
    save: { flex: 1 },
  });
