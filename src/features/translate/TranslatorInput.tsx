import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, shadows, spacing, typography } from '@/theme';

const MAX_LENGTH = 1500;

interface TranslatorInputProps {
  value: string;
  onChangeText: (value: string) => void;
  listening: boolean;
  micLevel: SharedValue<number>;
  onMic: () => void;
  onPaste: () => void;
  onClear: () => void;
}

/** Large text box with microphone, paste and clear. Translation starts by itself while you type. */
export function TranslatorInput({ value, onChangeText, listening, micLevel, onMic, onPaste, onClear }: TranslatorInputProps) {
  const t = useT();
  const empty = value.length === 0;

  return (
    <View style={styles.card}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={listening ? t('translate.listening') : t('translate.placeholder')}
        placeholderTextColor={listening ? colors.primary : colors.textMuted}
        selectionColor={colors.primary}
        multiline
        maxLength={MAX_LENGTH}
        autoCorrect={false}
        textAlignVertical="top"
        accessibilityLabel={t('translate.placeholder')}
        style={styles.input}
      />

      <View style={styles.footer}>
        <MicButton listening={listening} level={micLevel} label={t('translate.mic')} onPress={onMic} />
        <View style={styles.spacer} />
        {empty ? (
          <PressableScale accessibilityRole="button" onPress={onPaste} style={styles.pill}>
            <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
            <AppText variant="captionStrong" color={colors.primary}>
              {t('translate.paste')}
            </AppText>
          </PressableScale>
        ) : (
          <>
            <AppText variant="caption" color={colors.textMuted}>
              {value.length}/{MAX_LENGTH}
            </AppText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('translate.clear')}
              hitSlop={10}
              onPress={onClear}
              style={styles.clear}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </PressableScale>
          </>
        )}
      </View>
    </View>
  );
}

interface MicButtonProps {
  listening: boolean;
  level: SharedValue<number>;
  label: string;
  onPress: () => void;
}

function MicButton({ listening, level, label, onPress }: MicButtonProps) {
  const phase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(phase);
    phase.value = 0;
    if (listening) phase.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false);
  }, [listening, phase]);

  const ripple = useAnimatedStyle(() => ({
    opacity: listening ? 0.45 * (1 - phase.value) : 0,
    transform: [{ scale: 1 + phase.value * 0.7 + level.value * 0.25 }],
  }));

  return (
    <View style={styles.micWrap}>
      <Animated.View style={[styles.ripple, ripple]} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: listening }}
        onPress={onPress}
        style={[styles.mic, listening && styles.micOn]}
      >
        <Ionicons name={listening ? 'stop' : 'mic'} size={22} color={listening ? colors.onPrimary : colors.primary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  input: {
    ...typography.heading,
    fontWeight: '500',
    minHeight: 112,
    maxHeight: 220,
    padding: 0,
    color: colors.text,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  spacer: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  clear: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  micWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 48, height: 48, borderRadius: radii.pill, backgroundColor: colors.primary },
  mic: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  micOn: { backgroundColor: colors.primary },
});
