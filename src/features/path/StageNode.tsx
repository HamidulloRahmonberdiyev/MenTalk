import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Pressable3D } from '@/components/ui/Pressable3D';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { easing, enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { ACCENT, shade } from './color';
import { GUTTER, labelSide, NODE, nodeX, nodeY } from './layout';
import type { PathStage } from './path';
import { StarRow } from './StarRow';

const DEPTH = 6;
/** White frame between the coloured ring and the photo. */
const FRAME = 4;
const PASSED = ACCENT;

interface StageNodeProps {
  stage: PathStage;
  index: number;
  width: number;
  onPress: (stage: PathStage) => void;
}

/** One stop on the road: a round photo medallion of the topic, its status badge, and the label beside it. */
export const StageNode = memo(function StageNode({ stage, index, width, onPress }: StageNodeProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const language = useSettingsStore((state) => state.language);
  const { scenario, status } = stage;
  const x = nodeX(index, width);
  const y = nodeY(index);
  const side = labelSide(index, width);
  const locked = status === 'locked';
  const open = status === 'open';
  const passed = status === 'passed';
  const title = scenario.title[language];
  const dark = home.appearance === 'dark';

  const press = () => {
    if (locked) haptics.light();
    else haptics.selection();
    onPress(stage);
  };

  const ring = locked ? (dark ? '#4A4F5B' : '#CDD5E0') : ACCENT;
  const edgeColor = locked ? (dark ? '#2A2D35' : '#AEB8C6') : shade(ring, -0.3);

  const labelBox =
    side === 'right'
      ? { left: x + NODE / 2 + 16, right: GUTTER }
      : { left: GUTTER, right: width - (x - NODE / 2 - 16) };

  return (
    <Animated.View entering={enter.rise(80 + index * 70)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* A soft colour pool under the node, so each stage owns its bit of the road. */}
      {!locked ? (
        <View
          pointerEvents="none"
          style={[styles.pool, { left: x - NODE, top: y - NODE, backgroundColor: `${ACCENT}${dark ? '26' : '1A'}` }]}
        />
      ) : null}

      {open ? <Halo x={x} y={y} tint={ACCENT} /> : null}
      {open ? <HereBubble x={x} y={y} tint={ACCENT} label={t('path.current')} /> : null}

      <Pressable3D
        accessibilityRole="button"
        accessibilityLabel={`${t('path.stage', { n: stage.number })}. ${title}. ${locked ? t('path.locked') : passed ? t('path.passed') : t('path.start')}`}
        onPress={press}
        edgeColor={edgeColor}
        depth={DEPTH}
        radius={NODE / 2}
        style={[styles.node, { left: x - NODE / 2, top: y - NODE / 2 - DEPTH / 2 }]}
        faceStyle={[styles.face, { backgroundColor: ring }]}
      >
        <View style={styles.frame}>
          <View style={[styles.photo, { backgroundColor: ACCENT }]}>
            {scenario.image ? (
              <Image source={scenario.image} contentFit="cover" transition={200} style={StyleSheet.absoluteFill} />
            ) : (
              <LinearGradient
                colors={[shade(ACCENT, 0.3), shade(ACCENT, -0.2)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.center]}
              >
                <Ionicons name={scenario.icon} size={30} color="#FFFFFF" />
              </LinearGradient>
            )}
            {locked ? (
              <View style={[StyleSheet.absoluteFill, styles.center, styles.veil]}>
                <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
              </View>
            ) : null}
            {/* Light catching the top of the glass. */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
              locations={[0, 0.45]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>
      </Pressable3D>

      {passed ? (
        <View pointerEvents="none" style={[styles.badge, { left: x + NODE / 2 - 26, top: y - NODE / 2 - 6 }]}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
      ) : null}

      {passed ? (
        <View pointerEvents="none" style={[styles.stars, { left: x - 45, top: y + NODE / 2 + 10 }]}>
          <StarRow count={stage.stars} size={16} gap={3} />
        </View>
      ) : null}

      <PressableScale
        onPress={press}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        scaleTo={0.97}
        style={[
          styles.label,
          labelBox,
          { top: y - 36 },
          side === 'left' ? styles.labelLeft : styles.labelRight,
          open && { borderColor: ACCENT, borderBottomColor: shade(ACCENT, -0.15) },
          locked && styles.labelLocked,
        ]}
      >
        <View style={styles.pillRow}>
          <View style={[styles.stagePill, { backgroundColor: locked ? home.track : passed ? `${PASSED}22` : `${ACCENT}22` }]}>
            {passed ? <Ionicons name="checkmark-circle" size={12} color={PASSED} /> : locked ? <Ionicons name="lock-closed" size={11} color={home.textMuted} /> : null}
            <AppText
              variant="captionStrong"
              color={locked ? home.textMuted : passed ? PASSED : shade(ACCENT, dark ? 0.25 : -0.1)}
              style={styles.stageText}
              numberOfLines={1}
            >
              {t('path.stage', { n: stage.number }).toUpperCase()}
            </AppText>
          </View>
        </View>
        <AppText variant="bodyStrong" color={locked ? home.textMuted : home.text} numberOfLines={1} style={side === 'left' && styles.alignRight}>
          {title}
        </AppText>
        <AppText variant="caption" color={home.textMuted} numberOfLines={1} style={side === 'left' && styles.alignRight}>
          {stage.best !== null ? `${t('path.best')}: ${stage.best}/10` : scenario.subtitle[language]}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
});

/** Two rings breathing out of the open stage: the eye goes there first. */
function Halo({ x, y, tint }: { x: number; y: number; tint: string }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1800, easing: easing.out }), -1, false));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const outer = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.5 }],
  }));
  const inner = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.25 * (1 - pulse.get()),
  }));

  const size = NODE + 22;
  return (
    <View pointerEvents="none" style={[haloStyles.box, { left: x - size / 2, top: y - size / 2 + 2, width: size, height: size }]}>
      <Animated.View style={[haloStyles.ring, { borderColor: tint, borderRadius: size }, outer]} />
      <Animated.View style={[haloStyles.ring, haloStyles.inner, { borderColor: tint, borderRadius: size }, inner]} />
    </View>
  );
}

/** "You are here" bubble floating gently above the open stage. */
function HereBubble({ x, y, tint, label }: { x: number; y: number; tint: string; label: string }) {
  const reduceMotion = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    float.set(
      withRepeat(
        withSequence(withTiming(-5, { duration: 900, easing: easing.out }), withTiming(0, { duration: 900, easing: easing.out })),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(float);
  }, [float, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }] }));
  const width = 140;

  return (
    <Animated.View pointerEvents="none" style={[haloStyles.bubbleBox, { left: x - width / 2, top: y - NODE / 2 - 54, width }, animated]}>
      <View style={[haloStyles.bubble, { backgroundColor: tint, boxShadow: `0 6px 16px ${tint}66` }]}>
        <AppText variant="captionStrong" color="#FFFFFF" numberOfLines={1} style={haloStyles.bubbleText}>
          {label.toUpperCase()}
        </AppText>
      </View>
      <View style={[haloStyles.tail, { borderTopColor: tint }]} />
    </Animated.View>
  );
}

const haloStyles = StyleSheet.create({
  box: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFill, borderWidth: 4 },
  inner: { borderWidth: 3 },
  bubbleBox: { position: 'absolute', alignItems: 'center' },
  bubble: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radii.pill },
  bubbleText: { letterSpacing: 0.6, fontWeight: '800' },
  tail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

const createStyles = (home: Palette) =>
  StyleSheet.create({
    pool: { position: 'absolute', width: NODE * 2, height: NODE * 2, borderRadius: NODE },
    node: { position: 'absolute', width: NODE, height: NODE + DEPTH },
    face: { padding: 4, alignItems: 'center', justifyContent: 'center' },
    frame: {
      flex: 1,
      alignSelf: 'stretch',
      borderRadius: NODE,
      padding: FRAME / 2,
      backgroundColor: home.panel,
    },
    photo: { flex: 1, borderRadius: NODE, overflow: 'hidden' },
    center: { alignItems: 'center', justifyContent: 'center' },
    veil: { backgroundColor: 'rgba(24, 28, 38, 0.62)' },
    badge: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: PASSED,
      borderWidth: 3,
      borderColor: home.background,
    },
    stars: { position: 'absolute', width: 90, alignItems: 'center' },
    label: {
      position: 'absolute',
      gap: 2,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: home.panel,
      borderWidth: 1.5,
      borderColor: home.rim,
      borderBottomWidth: 4,
      borderBottomColor: home.rimBottom,
    },
    labelLeft: { alignItems: 'flex-end' },
    labelRight: { alignItems: 'flex-start' },
    labelLocked: { opacity: 0.7 },
    pillRow: { flexDirection: 'row', marginBottom: 2 },
    stagePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
    stageText: { fontSize: 11, lineHeight: 15, letterSpacing: 0.8, fontWeight: '800' },
    alignRight: { textAlign: 'right' },
  });
