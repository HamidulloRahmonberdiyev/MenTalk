import { useRef, type Ref } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { colors, radii, spacing, typography } from '@/theme';

import type { ParsedBirth } from './birthDate';

export interface BirthParts {
  day: string;
  month: string;
  year: string;
}

interface BirthDateFieldProps {
  value: BirthParts;
  onChange: (value: BirthParts) => void;
  parsed: ParsedBirth | null;
}

export function BirthDateField({ value, onChange, parsed }: BirthDateFieldProps) {
  const t = useT();
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const complete = value.year.length === 4;

  const update = (key: keyof BirthParts, max: number, text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, max);
    onChange({ ...value, [key]: digits });
    return digits.length === max;
  };

  const onDay = (text: string) => {
    if (update('day', 2, text)) monthRef.current?.focus();
  };
  const onMonth = (text: string) => {
    if (update('month', 2, text)) yearRef.current?.focus();
  };
  const onYear = (text: string) => {
    update('year', 4, text);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Box
          value={value.day}
          placeholder={t('onb.birth.day')}
          maxLength={2}
          onChangeText={onDay}
          autoFocus
          flex={1}
        />
        <Box
          ref={monthRef}
          value={value.month}
          placeholder={t('onb.birth.month')}
          maxLength={2}
          onChangeText={onMonth}
          flex={1}
        />
        <Box
          ref={yearRef}
          value={value.year}
          placeholder={t('onb.birth.year')}
          maxLength={4}
          onChangeText={onYear}
          flex={1.7}
        />
      </View>

      {parsed ? (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.pill, styles.pillOk]}>
          <AppText variant="captionStrong" color={colors.primaryDark}>
            {`🎂 ${t('onb.birth.age', { n: parsed.age })}`}
          </AppText>
        </Animated.View>
      ) : complete ? (
        <Animated.View entering={FadeIn.duration(250)} style={[styles.pill, styles.pillError]}>
          <AppText variant="captionStrong" color={colors.danger}>
            {t('onb.birth.invalid')}
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

interface BoxProps {
  ref?: Ref<TextInput>;
  value: string;
  placeholder: string;
  maxLength: number;
  onChangeText: (text: string) => void;
  flex: number;
  autoFocus?: boolean;
}

function Box({ ref, flex, ...rest }: BoxProps) {
  return (
    <TextInput
      ref={ref}
      {...rest}
      keyboardType="number-pad"
      placeholderTextColor={colors.textMuted}
      selectionColor={colors.primary}
      accessibilityLabel={rest.placeholder}
      style={[styles.box, { flex }]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
  box: {
    ...typography.title,
    height: 72,
    textAlign: 'center',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  pill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill },
  pillOk: { backgroundColor: colors.primarySoft },
  pillError: { backgroundColor: '#FDECEC' },
});
