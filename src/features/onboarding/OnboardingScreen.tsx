import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import type { StudyLanguage } from '@/services/learning';
import { pushOnboarding } from '@/services/session';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { colors, radii, spacing, typography } from '@/theme';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';
import type { CountryCode, Gender, LearnerExperience, LearnerLevel, LearningFocus, LearningGoal, LevelSource } from '@/types';

import { BirthDateField, type BirthParts } from './BirthDateField';
import { parseBirthDate } from './birthDate';
import { CountryPicker } from './CountryPicker';
import { OptionCard } from './OptionCard';
import { DAILY, EXPERIENCES, FOCUS, GENDERS, GOALS, LEVELS, STUDY_OPTIONS, levelLook } from './options';
import type { PlacementResult } from './placement/placement';
import { PlacementTest } from './placement/PlacementTest';
import { ProgressSegments } from './ProgressSegments';
import { Reveal } from './Reveal';
import { StepHero } from './StepHero';

type StepId = 'study' | 'name' | 'gender' | 'country' | 'birth' | 'experience' | 'level' | 'goals' | 'focus' | 'daily' | 'plan';

const STEPS: readonly { id: StepId; emoji: string }[] = [
  { id: 'study', emoji: '💬' },
  { id: 'name', emoji: '👋' },
  { id: 'gender', emoji: '🙋' },
  { id: 'country', emoji: '🌍' },
  { id: 'birth', emoji: '🎂' },
  { id: 'experience', emoji: '📖' },
  { id: 'level', emoji: '📊' },
  { id: 'goals', emoji: '🧭' },
  { id: 'focus', emoji: '🎯' },
  { id: 'daily', emoji: '🔥' },
  { id: 'plan', emoji: '🎉' },
];

export function OnboardingScreen() {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const insets = useSafeAreaInsets();
  const initialName = useUserStore((state) => state.name);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);
  const setStudyLanguage = useSettingsStore((state) => state.setStudyLanguage);

  const [step, setStep] = useState(0);
  const [forward, setForward] = useState(true);
  const [study, setStudy] = useState<StudyLanguage | null>(null);
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<Gender | null>(null);
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [birth, setBirth] = useState<BirthParts>({ day: '', month: '', year: '' });
  const [experience, setExperience] = useState<LearnerExperience | null>(null);
  const [level, setLevel] = useState<LearnerLevel | null>(null);
  const [levelSource, setLevelSource] = useState<LevelSource | null>(null);
  const [placement, setPlacement] = useState<PlacementResult | null>(null);
  const [placing, setPlacing] = useState(false);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [focus, setFocus] = useState<LearningFocus[]>([]);
  const [daily, setDaily] = useState<number>(10);

  // Someone who never studied the language is a beginner; asking them to test or rate themselves is noise.
  const steps = useMemo(() => STEPS.filter(({ id }) => id !== 'level' || experience !== 'none'), [experience]);
  const parsedBirth = useMemo(() => parseBirthDate(birth.day, birth.month, birth.year), [birth]);
  const current = steps[step];
  const direction = forward ? 'forward' : 'back';
  const isLast = step === steps.length - 1;

  const canContinue = {
    study: study !== null,
    name: name.trim().length >= 2,
    gender: gender !== null,
    country: country !== null,
    birth: parsedBirth !== null,
    experience: experience !== null,
    level: level !== null,
    goals: goals.length > 0,
    focus: focus.length > 0,
    daily: true,
    plan: true,
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

  const advance = () => {
    setForward(true);
    setStep((value) => value + 1);
  };

  const goNext = () => {
    if (!canContinue) return;
    if (!isLast) {
      advance();
      return;
    }
    if (!study || !gender || !country || !level || !levelSource || !experience || !parsedBirth) return;
    haptics.success();
    const answers = {
      studyLanguage: study,
      name: name.trim(),
      gender,
      country,
      birthDate: parsedBirth.iso,
      experience,
      level,
      levelSource,
      placementScore: levelSource === 'placement' ? (placement?.score ?? null) : null,
      goals,
      focus,
      dailyGoalMinutes: daily,
    };
    completeOnboarding(answers);
    void pushOnboarding(answers);
    router.replace('/home');
  };

  // Applied at once, so the next steps already name the right tutor and language.
  const chooseStudy = (language: StudyLanguage) => {
    if (language !== study) setPlacement(null);
    setStudy(language);
    setStudyLanguage(language);
  };

  const chooseExperience = (value: LearnerExperience) => {
    setExperience(value);
    if (value === 'none') {
      setLevel('beginner');
      setLevelSource('self');
      setPlacement(null);
    } else if (experience === 'none') {
      // The automatic "beginner" was never the learner's choice.
      setLevel(null);
      setLevelSource(null);
    }
  };

  const chooseLevel = (value: LearnerLevel) => {
    setLevel(value);
    setLevelSource(placement?.level === value ? 'placement' : 'self');
  };

  const finishPlacement = (result: PlacementResult) => {
    setPlacement(result);
    setLevel(result.level);
    setLevelSource('placement');
    setPlacing(false);
    advance();
  };

  const toggle = <T,>(list: T[], item: T): T[] => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]);

  if (placing && study) {
    return <PlacementTest language={study} onFinish={finishPlacement} onExit={() => setPlacing(false)} />;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.root}>
      <LinearGradient colors={[home.primarySoft, home.background]} style={styles.backdrop} pointerEvents="none" />

      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={8} onPress={goBack} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={home.text} />
        </PressableScale>
        <ProgressSegments count={steps.length} step={step} />
      </View>

      {current.id === 'country' ? (
        <View key="country" style={styles.countryStep}>
          <View style={styles.heading}>
            <Reveal index={0} direction={direction}>
              <AppText variant="title" style={styles.center} accessibilityRole="header">
                {t('onb.country.title')}
              </AppText>
            </Reveal>
            <Reveal index={1} direction={direction}>
              <AppText variant="body" color={home.textSecondary} style={styles.center}>
                {t('onb.country.subtitle')}
              </AppText>
            </Reveal>
          </View>
          <Reveal index={2} style={styles.countryPicker}>
            <CountryPicker value={country} onChange={setCountry} />
          </Reveal>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <StepHero emoji={current.emoji} />

          <View key={current.id} style={styles.step}>
            <View style={styles.heading}>
              <Reveal index={0} direction={direction}>
                <AppText variant="title" style={styles.center} accessibilityRole="header">
                  {t(`onb.${current.id}.title`)}
                </AppText>
              </Reveal>
              <Reveal index={1} direction={direction}>
                <AppText variant="body" color={home.textSecondary} style={styles.center}>
                  {t(`onb.${current.id}.subtitle`)}
                </AppText>
              </Reveal>
            </View>

            <View style={styles.body}>
              {current.id === 'study'
                ? STUDY_OPTIONS.map(({ id, emoji }, index) => (
                    <Reveal key={id} index={2 + index}>
                      <OptionCard
                        emoji={emoji}
                        title={t(`study.${id}`)}
                        description={t(`study.${id}.desc`)}
                        selected={study === id}
                        onPress={() => chooseStudy(id)}
                      />
                    </Reveal>
                  ))
                : null}

              {current.id === 'name' ? (
                <Reveal index={2}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    onSubmitEditing={goNext}
                    placeholder={t('onb.name.placeholder')}
                    placeholderTextColor={home.textMuted}
                    selectionColor={colors.primary}
                    autoFocus
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={30}
                    returnKeyType="next"
                    accessibilityLabel={t('onb.name.placeholder')}
                    style={styles.nameInput}
                  />
                </Reveal>
              ) : null}

              {current.id === 'gender'
                ? GENDERS.map(({ id, emoji }, index) => (
                    <Reveal key={id} index={2 + index}>
                      <OptionCard emoji={emoji} title={t(`onb.gender.${id}`)} selected={gender === id} onPress={() => setGender(id)} />
                    </Reveal>
                  ))
                : null}

              {current.id === 'birth' ? (
                <Reveal index={2}>
                  <BirthDateField value={birth} onChange={setBirth} parsed={parsedBirth} />
                </Reveal>
              ) : null}

              {current.id === 'experience'
                ? EXPERIENCES.map(({ id, emoji }, index) => (
                    <Reveal key={id} index={2 + index}>
                      <OptionCard
                        emoji={emoji}
                        title={t(`onb.experience.${id}`)}
                        description={t(`onb.experience.${id}.desc`)}
                        selected={experience === id}
                        onPress={() => chooseExperience(id)}
                      />
                    </Reveal>
                  ))
                : null}

              {current.id === 'level' ? (
                <>
                  <Reveal index={2}>
                    {placement ? (
                      <PlacementBadge result={placement} onRetry={() => setPlacing(true)} />
                    ) : (
                      <PlacementCta onPress={() => setPlacing(true)} />
                    )}
                  </Reveal>
                  <Reveal index={3}>
                    <View style={styles.divider}>
                      <View style={styles.rule} />
                      <AppText variant="captionStrong" color={home.textMuted}>
                        {t('onb.level.manual')}
                      </AppText>
                      <View style={styles.rule} />
                    </View>
                  </Reveal>
                  {LEVELS.map(({ id, emoji, cefr }, index) => (
                    <Reveal key={id} index={4 + index}>
                      <OptionCard
                        emoji={emoji}
                        tag={cefr}
                        title={t(`onb.level.${id}`)}
                        description={t(`onb.level.${id}.desc`)}
                        selected={level === id}
                        onPress={() => chooseLevel(id)}
                      />
                    </Reveal>
                  ))}
                </>
              ) : null}

              {current.id === 'goals' ? (
                <View style={styles.grid}>
                  {GOALS.map(({ id, emoji }, index) => (
                    <Reveal key={id} index={2 + index} style={styles.cell}>
                      <OptionCard
                        tile
                        multi
                        emoji={emoji}
                        title={t(`onb.goal.${id}`)}
                        selected={goals.includes(id)}
                        onPress={() => setGoals((list) => toggle(list, id))}
                      />
                    </Reveal>
                  ))}
                </View>
              ) : null}

              {current.id === 'focus' ? (
                <View style={styles.grid}>
                  {FOCUS.map(({ id, emoji }, index) => (
                    <Reveal key={id} index={2 + index} style={styles.cell}>
                      <OptionCard
                        tile
                        multi
                        emoji={emoji}
                        title={t(`onb.focus.${id}`)}
                        selected={focus.includes(id)}
                        onPress={() => setFocus((list) => toggle(list, id))}
                      />
                    </Reveal>
                  ))}
                </View>
              ) : null}

              {current.id === 'daily' ? (
                <View style={styles.grid}>
                  {DAILY.map(({ minutes, emoji }, index) => (
                    <Reveal key={minutes} index={2 + index} style={styles.cell}>
                      <OptionCard
                        tile
                        emoji={emoji}
                        title={t('common.minutes', { n: minutes })}
                        description={t(`onb.daily.${minutes}`)}
                        selected={daily === minutes}
                        onPress={() => setDaily(minutes)}
                      />
                    </Reveal>
                  ))}
                </View>
              ) : null}

              {current.id === 'plan' && study && level ? (
                <Reveal index={2}>
                  <View style={styles.plan}>
                    <PlanRow emoji={STUDY_OPTIONS.find(({ id }) => id === study)?.emoji ?? '🗣️'} label={t('onb.plan.language')} value={t(`study.${study}`)} />
                    <PlanRow
                      emoji={levelLook(level).emoji}
                      label={t('onb.plan.level')}
                      value={`${t(`onb.level.${level}`)} · ${levelLook(level).cefr}`}
                      note={levelSource === 'placement' && placement ? t('onb.plan.tested', { n: placement.score }) : undefined}
                    />
                    <PlanRow emoji="🔥" label={t('onb.plan.daily')} value={t('common.minutes', { n: daily })} />
                    <PlanRow emoji="🧭" label={t('onb.plan.goals')} value={goals.map((goal) => t(`onb.goal.${goal}`)).join(', ')} />
                    <PlanRow emoji="🎯" label={t('onb.plan.focus')} value={focus.map((item) => t(`onb.focus.${item}`)).join(', ')} last />
                  </View>
                </Reveal>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}

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

/** The recommended path on the level step: a blue card that starts the test. */
function PlacementCta({ onPress }: { onPress: () => void }) {
  const t = useT();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable3D
      accessibilityRole="button"
      accessibilityLabel={t('onb.level.test')}
      onPress={() => {
        haptics.medium();
        onPress();
      }}
      edgeColor="#1A84BF"
      radius={radii.xl}
      faceStyle={styles.ctaFace}
    >
      <LinearGradient colors={[colors.primaryLight, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
        <View style={styles.ctaIcon}>
          <AppText style={styles.ctaEmoji}>🎯</AppText>
        </View>
        <View style={styles.ctaTexts}>
          <View style={styles.ctaBadge}>
            <AppText variant="captionStrong" color={colors.onPrimary}>
              {t('onb.level.recommended')}
            </AppText>
          </View>
          <AppText variant="subheading" color={colors.onPrimary}>
            {t('onb.level.test')}
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.9)">
            {t('onb.level.test.desc')}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.onPrimary} />
      </LinearGradient>
    </Pressable3D>
  );
}

/** Replaces the call to action once the test is taken. */
function PlacementBadge({ result, onRetry }: { result: PlacementResult; onRetry: () => void }) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const look = levelLook(result.level);
  return (
    <View style={styles.badge}>
      <View style={[styles.badgeIcon, { backgroundColor: home.successFill }]}>
        <Ionicons name="checkmark-circle" size={26} color={home.successInk} />
      </View>
      <View style={styles.ctaTexts}>
        <AppText variant="caption" color={home.textMuted}>
          {t('onb.level.tested')}
        </AppText>
        <AppText variant="bodyStrong" color={home.text}>
          {t(`onb.level.${result.level}`)} · {look.cefr} · {result.score}%
        </AppText>
      </View>
      <PressableScale accessibilityRole="button" hitSlop={8} onPress={onRetry}>
        <AppText variant="captionStrong" color={home.accent}>
          {t('placement.retry')}
        </AppText>
      </PressableScale>
    </View>
  );
}

function PlanRow({ emoji, label, value, note, last = false }: { emoji: string; label: string; value: string; note?: string; last?: boolean }) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.planRow, !last && styles.planRule]}>
      <View style={styles.planIcon}>
        <AppText style={styles.planEmoji}>{emoji}</AppText>
      </View>
      <View style={styles.ctaTexts}>
        <AppText variant="caption" color={home.textMuted}>
          {label}
        </AppText>
        <AppText variant="bodyStrong" color={home.text}>
          {value}
        </AppText>
      </View>
      {note ? (
        <View style={[styles.planNote, { backgroundColor: home.successFill }]}>
          <AppText variant="captionStrong" color={home.successInk}>
            {note}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
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
      backgroundColor: home.panel,
      borderWidth: 2,
      borderColor: home.rim,
    },
    scroll: { flexGrow: 1, gap: spacing.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
    step: { gap: spacing.xxl },
    countryStep: { flex: 1, gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    countryPicker: { flex: 1 },
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
      borderBottomWidth: 5,
      borderColor: colors.primary,
      borderBottomColor: '#1A84BF',
      backgroundColor: home.panel,
      color: home.text,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    cell: { width: '47.5%', flexGrow: 1, flexDirection: 'row' },
    divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs },
    rule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: home.rim },
    ctaFace: { overflow: 'hidden' },
    cta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
    ctaIcon: {
      width: 56,
      height: 56,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    ctaEmoji: { fontSize: 30, lineHeight: 36 },
    ctaTexts: { flex: 1, gap: 2 },
    ctaBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: 1,
      marginBottom: 2,
      borderRadius: radii.pill,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    badgeIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
    plan: {
      paddingHorizontal: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
    planRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: home.divider },
    planIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: home.primaryTint },
    planEmoji: { fontSize: 22, lineHeight: 28 },
    planNote: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
    footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  });
