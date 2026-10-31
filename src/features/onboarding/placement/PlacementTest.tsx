import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { Pressable3D } from "@/components/ui/Pressable3D";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useT } from "@/i18n";
import { haptics } from "@/services/haptics";
import type { StudyLanguage } from "@/services/learning";
import { colors, radii, spacing } from "@/theme";
import { usePalette, useThemedStyles, type Palette } from "@/theme/appearance";

import { levelLook } from "../options";
import {
  BAND_COUNT,
  PER_BAND,
  PLACEMENT_START,
  answerPlacement,
  placementAnswered,
  placementResult,
  type PlacementResult,
} from "./placement";
import { PLACEMENT_BANK } from "./questions";

interface PlacementTestProps {
  language: StudyLanguage;
  onFinish: (result: PlacementResult) => void;
  onExit: () => void;
}

const TOTAL = BAND_COUNT * PER_BAND;

/** Fisher–Yates on a copy, so the right answer is not always first. */
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

/**
 * The placement test: up to twelve gap-fill questions in three bands of rising difficulty. No
 * right/wrong feedback on purpose, so guessing is not rewarded and a weak start does not discourage.
 */
export function PlacementTest({
  language,
  onFinish,
  onExit,
}: PlacementTestProps) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [state, setState] = useState(PLACEMENT_START);
  const [picked, setPicked] = useState<string | null>(null);

  const question = PLACEMENT_BANK[language][state.band]?.[state.index];
  const options = useMemo(
    () => (question ? shuffled(question.options) : []),
    [question],
  );
  const answered = placementAnswered(state);
  const result = state.finished ? placementResult(state) : null;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onExit();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onExit]);

  const submit = (choice: string | null) => {
    if (!question) return;
    const next = answerPlacement(state, choice === question.options[0]);
    if (next.finished) haptics.success();
    else haptics.light();
    setPicked(null);
    setState(next);
  };

  const restart = () => {
    haptics.light();
    setPicked(null);
    setState(PLACEMENT_START);
  };

  if (result)
    return (
      <PlacementSummary
        result={result}
        onContinue={() => onFinish(result)}
        onRetry={restart}
      />
    );
  if (!question) return null;

  const [lead, trail] = question.prompt.split("___");
  const dialogue = question.prompt.startsWith("—");

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.top}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          hitSlop={8}
          onPress={onExit}
          style={styles.close}
        >
          <Ionicons name="close" size={24} color={home.textMuted} />
        </PressableScale>
        <View style={styles.bar}>
          <ProgressBar value={answered / TOTAL} trackColor={home.track} />
        </View>
        <AppText variant="captionStrong" color={home.textMuted}>
          {answered + 1}/{TOTAL}
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={`${state.band}-${state.index}`}
          entering={FadeInRight.duration(320)}
          style={styles.questionWrap}
        >
          <View style={styles.kicker}>
            <Ionicons name="sparkles" size={14} color={home.accent} />
            <AppText variant="captionStrong" color={home.accent}>
              {t(dialogue ? "placement.reply" : "placement.fill")}
            </AppText>
          </View>

          <View style={styles.card}>
            <AppText variant="heading" color={home.text} style={styles.prompt}>
              {lead}
              <AppText
                variant="heading"
                color={picked ? home.accent : home.textMuted}
                style={picked ? styles.filled : undefined}
              >
                {picked ?? " ______ "}
              </AppText>
              {trail}
            </AppText>
          </View>

          <View style={styles.options}>
            {options.map((option) => {
              const chosen = picked === option;
              return (
                <Pressable3D
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  accessibilityLabel={option}
                  onPress={() => {
                    haptics.selection();
                    setPicked(option);
                  }}
                  edgeColor={chosen ? "#1A84BF" : home.rimBottom}
                  depth={4}
                  radius={radii.lg}
                  faceStyle={[styles.option, chosen && styles.optionOn]}
                >
                  <AppText
                    variant="bodyStrong"
                    color={chosen ? home.accent : home.text}
                    style={styles.optionText}
                  >
                    {option}
                  </AppText>
                </Pressable3D>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
      >
        <Button
          title={t("placement.skip")}
          variant="soft"
          onPress={() => submit(null)}
          style={styles.footerButton}
        />
        <Button
          title={t("placement.check")}
          disabled={picked === null}
          onPress={() => submit(picked)}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

function PlacementSummary({
  result,
  onContinue,
  onRetry,
}: {
  result: PlacementResult;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const t = useT();
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const look = levelLook(result.level);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxl }]}>
      <ScrollView
        contentContainerStyle={styles.summary}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={styles.trophy}
        >
          <AppText style={styles.trophyEmoji}>{look.emoji}</AppText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(420)}
          style={styles.summaryHeading}
        >
          <AppText
            variant="title"
            color={home.text}
            style={styles.center}
            accessibilityRole="header"
          >
            {t("placement.done.title")}
          </AppText>
          <AppText color={home.textSecondary} style={styles.center}>
            {t("placement.done.subtitle")}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(420)}>
          <View style={[styles.levelEdge, { backgroundColor: look.edge }]}>
            <LinearGradient
              colors={look.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.levelCard}
            >
              <View style={styles.levelTop}>
                <AppText variant="captionStrong" color="rgba(255,255,255,0.85)">
                  {t("placement.yourLevel")}
                </AppText>
                <View style={styles.cefr}>
                  <AppText variant="captionStrong" color={colors.onPrimary}>
                    {look.cefr}
                  </AppText>
                </View>
              </View>
              <AppText variant="display" color={colors.onPrimary}>
                {t(`onb.level.${result.level}`)}
              </AppText>
              <AppText color="rgba(255,255,255,0.92)">
                {t(`onb.level.${result.level}.desc`)}
              </AppText>
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(340).duration(420)}
          style={styles.stats}
        >
          <Stat
            icon="checkmark-circle"
            tint={home.successInk}
            value={`${result.correct}/${TOTAL}`}
            label={t("placement.correct")}
          />
          <Stat
            icon="analytics"
            tint={home.accent}
            value={`${result.score}%`}
            label={t("placement.score")}
          />
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          styles.footerColumn,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
      >
        <Button
          title={t("onb.continue")}
          icon="arrow-forward"
          iconPosition="right"
          onPress={onContinue}
        />
        <PressableScale
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retry}
        >
          <AppText variant="bodyStrong" color={home.accent}>
            {t("placement.retry")}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

function Stat({
  icon,
  tint,
  value,
  label,
}: {
  icon: "checkmark-circle" | "analytics";
  tint: string;
  value: string;
  label: string;
}) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={22} color={tint} />
      <View>
        <AppText variant="heading" color={home.text}>
          {value}
        </AppText>
        <AppText variant="caption" color={home.textMuted}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

const createStyles = (home: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: home.background },
    top: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    close: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    bar: { flex: 1 },
    content: { flexGrow: 1, padding: spacing.xl, paddingTop: spacing.xxl },
    questionWrap: { gap: spacing.xl },
    kicker: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      backgroundColor: home.primaryTint,
    },
    card: {
      minHeight: 132,
      justifyContent: "center",
      padding: spacing.xl,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
    prompt: { fontSize: 22, lineHeight: 34 },
    filled: { textDecorationLine: "underline" },
    options: { gap: spacing.md },
    option: {
      minHeight: 58,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 2,
      borderColor: home.rim,
      backgroundColor: home.panel,
    },
    optionOn: { borderColor: colors.primary, backgroundColor: home.selected },
    optionText: { textAlign: "center" },
    footer: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: home.divider,
    },
    footerColumn: { flexDirection: "column", borderTopWidth: 0 },
    footerButton: { flex: 1 },
    retry: { alignSelf: "center", paddingVertical: spacing.sm },
    summary: {
      flexGrow: 1,
      gap: spacing.xl,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
    },
    trophy: {
      alignSelf: "center",
      width: 112,
      height: 112,
      borderRadius: radii.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: home.panel,
      borderWidth: 2,
      borderBottomWidth: 6,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
    },
    trophyEmoji: { fontSize: 56, lineHeight: 68 },
    summaryHeading: { gap: spacing.sm },
    center: { textAlign: "center" },
    // The darker edge peeks out under the gradient, like the 3D buttons.
    levelEdge: { paddingBottom: 6, borderRadius: radii.xl },
    levelCard: { gap: spacing.sm, padding: spacing.xl, borderRadius: radii.xl },
    levelTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cefr: {
      paddingHorizontal: spacing.md,
      paddingVertical: 2,
      borderRadius: radii.pill,
      backgroundColor: "rgba(255,255,255,0.25)",
    },
    stats: { flexDirection: "row", gap: spacing.md },
    stat: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderBottomWidth: 5,
      borderColor: home.rim,
      borderBottomColor: home.rimBottom,
      backgroundColor: home.panel,
    },
  });
