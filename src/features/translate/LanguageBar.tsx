import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, shadows, spacing } from '@/theme';
import type { LanguageCode, UzbekScript } from '@/types';

import { TRANSLATE_LANGUAGES, languageOf } from './languages';
import type { SourceLanguage } from './translateService';

interface LanguageBarProps {
  source: SourceLanguage;
  target: LanguageCode;
  /** Language detected from the input while the source is "auto". */
  detected?: LanguageCode;
  uzScript: UzbekScript;
  onChange: (source: SourceLanguage, target: LanguageCode) => void;
  onSwap: () => void;
  onUzScript: (script: UzbekScript) => void;
}

type Side = 'source' | 'target';

export function LanguageBar({ source, target, detected, uzScript, onChange, onSwap, onUzScript }: LanguageBarProps) {
  const t = useT();
  const [picking, setPicking] = useState<Side | null>(null);

  const sourceLabel =
    source === 'auto'
      ? detected
        ? `${languageOf(detected).flag} ${languageOf(detected).name}`
        : `✨ ${t('translate.auto')}`
      : `${languageOf(source).flag} ${languageOf(source).name}`;
  const targetLabel = `${languageOf(target).flag} ${languageOf(target).name}`;

  const choose = (side: Side, code: SourceLanguage) => {
    haptics.selection();
    setPicking(null);
    if (side === 'source') {
      // Picking the current target as the source swaps the pair instead of translating a language into itself.
      if (code !== 'auto' && code === target) onChange(code, source === 'auto' ? 'en' : source);
      else onChange(code, target);
    } else if (code !== 'auto') {
      if (code === source) onChange(target, code);
      else onChange(source, code);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <LanguageChip label={sourceLabel} hint={t('translate.from')} detected={source === 'auto' && Boolean(detected)} onPress={() => setPicking('source')} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('translate.swap')}
          onPress={onSwap}
          style={styles.swap}
        >
          <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
        </PressableScale>
        <LanguageChip label={targetLabel} hint={t('translate.to')} onPress={() => setPicking('target')} />
      </View>

      {target === 'uz' ? (
        <View style={styles.script}>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('translate.script')}
          </AppText>
          {(['latin', 'cyrillic'] as const).map((value) => (
            <PressableScale
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: uzScript === value }}
              onPress={() => {
                haptics.selection();
                onUzScript(value);
              }}
              style={[styles.scriptChip, uzScript === value && styles.scriptChipOn]}
            >
              <AppText variant="captionStrong" color={uzScript === value ? colors.onPrimary : colors.textSecondary}>
                {value === 'latin' ? 'Lotin' : 'Кирилл'}
              </AppText>
            </PressableScale>
          ))}
        </View>
      ) : null}

      <LanguagePicker
        side={picking}
        selected={picking === 'source' ? source : target}
        onClose={() => setPicking(null)}
        onPick={(code) => picking && choose(picking, code)}
      />
    </View>
  );
}

interface LanguageChipProps {
  label: string;
  hint: string;
  detected?: boolean;
  onPress: () => void;
}

function LanguageChip({ label, hint, detected = false, onPress }: LanguageChipProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${hint}: ${label}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={styles.chip}
    >
      <AppText variant="captionStrong" color={detected ? colors.primaryDark : colors.textMuted}>
        {hint}
      </AppText>
      <View style={styles.chipRow}>
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.chipLabel}>
          {label}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </View>
    </PressableScale>
  );
}

interface LanguagePickerProps {
  side: Side | null;
  selected: SourceLanguage;
  onClose: () => void;
  onPick: (code: SourceLanguage) => void;
}

function LanguagePicker({ side, selected, onClose, onPick }: LanguagePickerProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const options: readonly { code: SourceLanguage; label: string }[] = [
    ...(side === 'source' ? [{ code: 'auto' as const, label: `✨ ${t('translate.auto')}` }] : []),
    ...TRANSLATE_LANGUAGES.map((item) => ({ code: item.code, label: `${item.flag} ${item.name}` })),
  ];

  return (
    <Modal visible={side !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.cancel')}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]} onPress={() => undefined}>
          <View style={styles.grabber} />
          <AppText variant="heading" style={styles.sheetTitle}>
            {side === 'source' ? t('translate.from') : t('translate.to')}
          </AppText>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map(({ code, label }) => {
              const active = code === selected;
              return (
                <PressableScale
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => onPick(code)}
                  style={[styles.option, active && styles.optionOn]}
                >
                  <AppText variant="bodyStrong" style={styles.optionLabel}>
                    {label}
                  </AppText>
                  {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </PressableScale>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  chip: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chipLabel: { flexShrink: 1 },
  swap: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  script: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  scriptChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  scriptChipOn: { backgroundColor: colors.primary },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 24, 40, 0.45)' },
  sheet: {
    maxHeight: '75%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  sheetTitle: { marginBottom: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radii.md },
  optionOn: { backgroundColor: colors.primaryTint },
  optionLabel: { flex: 1 },
});
