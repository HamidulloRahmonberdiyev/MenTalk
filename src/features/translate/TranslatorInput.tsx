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
import { Pressable3D } from '@/components/ui/Pressable3D';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, spacing, typography } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

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
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const empty = value.length === 0;

  return (
    <View style={[styles.card, listening && styles.cardListening]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={listening ? t('translate.listening') : t('translate.placeholder')}
        placeholderTextColor={listening ? colors.primary : home.textMuted}
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
            <Ionicons name="clipboard-outline" size={18} color={home.accent} />
            <AppText variant="captionStrong" color={home.accent}>
              {t('translate.paste')}
            </AppText>
          </PressableScale>
        ) : (
          <>
            <AppText variant="caption" color={home.textMuted}>
              {value.length}/{MAX_LENGTH}
            </AppText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('translate.clear')}
              hitSlop={10}
              onPress={onClear}
              style={styles.clear}
            >
              <Ionicons name="close" size={18} color={home.textMuted} />
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
  const styles = useThemedStyles(createStyles);
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
      <Pressable3D
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: listening }}
        onPress={onPress}
        edgeColor={listening ? '#B91C1C' : '#1A84BF'}
        depth={4}
        radius={radii.pill}
        faceStyle={[styles.mic, listening && styles.micOn]}
      >
        <Ionicons name={listening ? 'stop' : 'mic'} size={24} color={colors.onPrimary} />
      </Pressable3D>
    </View>
  );
}

const MIC = 52;

const createStyles = (home: Palette) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    cardListening: { borderColor: colors.primary },
    input: {
      ...typography.heading,
      fontWeight: '600',
      minHeight: 112,
      maxHeight: 220,
      padding: 0,
      color: home.text,
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
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.track,
    },
    clear: {
      width: 32,
      height: 32,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: home.track,
    },
    micWrap: { width: MIC, height: MIC + 4, alignItems: 'center', justifyContent: 'center' },
    ripple: { position: 'absolute', top: 0, width: MIC, height: MIC, borderRadius: radii.pill, backgroundColor: colors.primary },
    mic: {
      width: MIC,
      height: MIC,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    micOn: { backgroundColor: colors.danger },
  });
