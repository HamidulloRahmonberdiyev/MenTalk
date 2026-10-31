import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { colors, radii, spacing } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
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
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
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
        <Pressable3D
          accessibilityRole="button"
          accessibilityLabel={t('translate.swap')}
          onPress={() => {
            haptics.light();
            onSwap();
          }}
          edgeColor="#1A84BF"
          depth={4}
          radius={radii.pill}
          faceStyle={styles.swap}
        >
          <Ionicons name="swap-horizontal" size={22} color={colors.onPrimary} />
        </Pressable3D>
        <LanguageChip label={targetLabel} hint={t('translate.to')} onPress={() => setPicking('target')} />
      </View>

      {target === 'uz' ? (
        <View style={styles.script}>
          <AppText variant="captionStrong" color={home.textMuted}>
            {t('translate.script')}
          </AppText>
          {(['latin', 'cyrillic'] as const).map((value) => {
            const on = uzScript === value;
            return (
              <PressableScale
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.selection();
                  onUzScript(value);
                }}
                style={[styles.scriptChip, on && styles.scriptChipOn]}
              >
                <AppText variant="captionStrong" color={on ? home.accent : home.textMuted}>
                  {value === 'latin' ? 'Lotin' : 'Кирилл'}
                </AppText>
              </PressableScale>
            );
          })}
        </View>
      ) : null}

      <LanguagePicker
        side={picking}
        source={source}
        target={target}
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
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={`${hint}: ${label}`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      edgeColor={home.rim}
      depth={4}
      radius={radii.md}
      style={styles.flex}
      faceStyle={styles.chip}
    >
      <AppText variant="captionStrong" color={detected ? home.accent : home.textMuted} style={styles.caps}>
        {hint}
      </AppText>
      <View style={styles.chipRow}>
        <AppText variant="bodyStrong" color={home.text} numberOfLines={1} style={styles.chipLabel}>
          {label}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={home.textMuted} />
      </View>
    </Pressable3D>
  );
}

interface LanguagePickerProps {
  side: Side | null;
  source: SourceLanguage;
  target: LanguageCode;
  onClose: () => void;
  onPick: (code: SourceLanguage) => void;
}

function LanguagePicker({ side: requested, source, target, onClose, onPick }: LanguagePickerProps) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  // The list keeps showing while the sheet slides away after a pick.
  const [side, setSide] = useState(requested);
  if (requested && requested !== side) setSide(requested);
  const selected = side === 'source' ? source : target;
  const options: readonly { code: SourceLanguage; label: string }[] = [
    ...(side === 'source' ? [{ code: 'auto' as const, label: `✨ ${t('translate.auto')}` }] : []),
    ...TRANSLATE_LANGUAGES.map((item) => ({ code: item.code, label: `${item.flag} ${item.name}` })),
  ];

  return (
    <BottomSheet visible={requested !== null} onClose={onClose} closeLabel={t('common.cancel')} style={styles.sheet}>
      <AppText variant="heading">{side === 'source' ? t('translate.from') : t('translate.to')}</AppText>
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
              <AppText variant="bodyStrong" style={styles.flex}>
                {label}
              </AppText>
              {active ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
            </PressableScale>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    wrap: { gap: spacing.md },
    flex: { flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    chip: {
      gap: 2,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    caps: { textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11, lineHeight: 14 },
    chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    chipLabel: { flexShrink: 1 },
    swap: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    script: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
    scriptChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    scriptChipOn: { borderColor: colors.primary, backgroundColor: home.selected },
    // The picker lives in the light bottom sheet, so it keeps the light tokens.
    sheet: { maxHeight: '75%', gap: spacing.sm },
    option: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radii.md },
    optionOn: { backgroundColor: colors.primaryTint },
  });
