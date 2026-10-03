import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useUserStore } from '@/store/userStore';
import { colors, radii, spacing, typography } from '@/theme';
import type { Gender, LearningGoal, RussianLevel } from '@/types';

import { BirthDateField, type BirthParts } from './BirthDateField';
import { parseBirthDate } from './birthDate';
import { OptionCard } from './OptionCard';

type StepId = 'name' | 'gender' | 'birth' | 'level' | 'goals' | 'daily';

const STEPS: readonly { id: StepId; emoji: string }[] = [
  { id: 'name', emoji: '👋' },
  { id: 'gender', emoji: '🙋' },
  { id: 'birth', emoji: '🎂' },
  { id: 'level', emoji: '🌱' },
  { id: 'goals', emoji: '🧭' },
  { id: 'daily', emoji: '🔥' },
];

const GENDERS: readonly { id: Gender; emoji: string }[] = [
  { id: 'male', emoji: '👨' },
  { id: 'female', emoji: '👩' },
  { id: 'unspecified', emoji: '🙂' },
];

const LEVELS: readonly { id: RussianLevel; emoji: string }[] = [
  { id: 'beginner', emoji: '🌱' },
  { id: 'elementary', emoji: '🌿' },
  { id: 'intermediate', emoji: '🌳' },
  { id: 'advanced', emoji: '🚀' },
];

const GOALS: readonly { id: LearningGoal; emoji: string }[] = [
  { id: 'travel', emoji: '✈️' },
  { id: 'work', emoji: '💼' },
  { id: 'study', emoji: '🎓' },
  { id: 'relocation', emoji: '🏠' },
  { id: 'family', emoji: '❤️' },
  { id: 'fun', emoji: '🎬' },
];

const DAILY: readonly { minutes: 5 | 10 | 15 | 20; emoji: string }[] = [
  { minutes: 5, emoji: '☕' },
  { minutes: 10, emoji: '🙂' },
  { minutes: 15, emoji: '💪' },
  { minutes: 20, emoji: '🔥' },
];

export function OnboardingScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const initialName = useUserStore((state) => state.name);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);

  const [step, setStep] = useState(0);
  const [forward, setForward] = useState(true);
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<Gender | null>(null);
  const [birth, setBirth] = useState<BirthParts>({ day: '', month: '', year: '' });
  const [level, setLevel] = useState<RussianLevel | null>(null);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [daily, setDaily] = useState<number>(10);

  const parsedBirth = useMemo(() => parseBirthDate(birth.day, birth.month, birth.year), [birth]);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const canContinue = {
    name: name.trim().length >= 2,
    gender: gender !== null,
    birth: parsedBirth !== null,
    level: level !== null,
    goals: goals.length > 0,
    daily: true,
  }[current.id];

  const goBack = useCallback(() => {
    haptics.light();
    if (step === 0) {
      router.back();
      return;
    }
    setForward(false);
    setStep((value) => value - 1);
  }, [step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [step, goBack]);

  const goNext = () => {
    if (!canContinue) return;
    if (!isLast) {
      setForward(true);
      setStep((value) => value + 1);
      return;
    }
    if (!gender || !level || !parsedBirth) return;
    haptics.success();
    completeOnboarding({
      name: name.trim(),
      gender,
      birthDate: parsedBirth.iso,
      level,
      goals,
      dailyGoalMinutes: daily,
    });
    router.replace('/home');
  };

  const toggleGoal = (goal: LearningGoal) =>
    setGoals((list) => (list.includes(goal) ? list.filter((item) => item !== goal) : [...list, goal]));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.root}>
      <LinearGradient colors={[colors.primarySoft, colors.background]} style={styles.backdrop} pointerEvents="none" />

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          onPress={goBack}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </PressableScale>
        <View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}>
          {STEPS.map((item, index) => (
            <View key={item.id} style={[styles.segment, index <= step && styles.segmentOn]} />
          ))}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Animated.View
          key={current.id}
          entering={(forward ? FadeInRight : FadeInLeft).duration(320)}
          style={styles.step}
        >
          <Animated.View entering={ZoomIn.springify().damping(12).delay(80)} style={styles.hero}>
            <AppText style={styles.heroEmoji}>{current.emoji}</AppText>
          </Animated.View>

          <View style={styles.heading}>
            <AppText variant="title" style={styles.center} accessibilityRole="header">
              {t(`onb.${current.id}.title`)}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.center}>
              {t(`onb.${current.id}.subtitle`)}
            </AppText>
          </View>

          <View style={styles.body}>
            {current.id === 'name' ? (
              <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={goNext}
                placeholder={t('onb.name.placeholder')}
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                returnKeyType="next"
                accessibilityLabel={t('onb.name.placeholder')}
                style={styles.nameInput}
              />
            ) : null}

            {current.id === 'gender'
              ? GENDERS.map(({ id, emoji }) => (
                  <OptionCard
                    key={id}
                    emoji={emoji}
                    title={t(`onb.gender.${id}`)}
                    selected={gender === id}
                    onPress={() => setGender(id)}
                  />
                ))
              : null}

            {current.id === 'birth' ? <BirthDateField value={birth} onChange={setBirth} parsed={parsedBirth} /> : null}

            {current.id === 'level'
              ? LEVELS.map(({ id, emoji }) => (
                  <OptionCard
                    key={id}
                    emoji={emoji}
                    title={t(`onb.level.${id}`)}
                    description={t(`onb.level.${id}.desc`)}
                    selected={level === id}
                    onPress={() => setLevel(id)}
                  />
                ))
              : null}

            {current.id === 'goals' ? (
              <View style={styles.grid}>
                {GOALS.map(({ id, emoji }) => (
                  <View key={id} style={styles.cell}>
                    <OptionCard
                      tile
                      multi
                      emoji={emoji}
                      title={t(`onb.goal.${id}`)}
                      selected={goals.includes(id)}
                      onPress={() => toggleGoal(id)}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            {current.id === 'daily' ? (
              <View style={styles.grid}>
                {DAILY.map(({ minutes, emoji }) => (
                  <View key={minutes} style={styles.cell}>
                    <OptionCard
                      tile
                      emoji={emoji}
                      title={t('common.minutes', { n: minutes })}
                      description={t(`onb.daily.${minutes}`)}
                      selected={daily === minutes}
                      onPress={() => setDaily(minutes)}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button
          title={isLast ? t('onb.finish') : t('onb.continue')}
          icon={isLast ? 'rocket' : 'arrow-forward'}
          iconPosition="right"
          disabled={!canContinue}
          onPress={goNext}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 6, borderRadius: radii.pill, backgroundColor: colors.border },
  segmentOn: { backgroundColor: colors.primary },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  step: { gap: spacing.xxl },
  hero: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    boxShadow: '0 14px 34px rgba(42, 171, 238, 0.28)',
  },
  heroEmoji: { fontSize: 50, lineHeight: 62 },
  heading: { gap: spacing.sm },
  center: { textAlign: 'center' },
  body: { gap: spacing.md },
  nameInput: {
    ...typography.heading,
    height: 64,
    paddingHorizontal: spacing.xl,
    textAlign: 'center',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: '47.5%', flexGrow: 1, flexDirection: 'row' },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});
