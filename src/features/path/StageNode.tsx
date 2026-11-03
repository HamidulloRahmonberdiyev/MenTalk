import { Ionicons } from '@expo/vector-icons';
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
import { haptics } from '@/services/haptics';
import { radii, spacing } from '@/theme';
import { easing, enter } from '@/theme/motion';
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

import { shade } from './color';
import { GUTTER, labelSide, NODE, nodeX, nodeY } from './layout';
import type { PathStage } from './path';
import { StarRow } from './StarRow';

const DEPTH = 7;

interface StageNodeProps {
  stage: PathStage;
  index: number;
  width: number;
  onPress: (stage: PathStage) => void;
}

/** One stop on the path: the round 3D button, its halo or lock, and the label card beside it. */
export const StageNode = memo(function StageNode({ stage, index, width, onPress }: StageNodeProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const { scenario, status } = stage;
  const x = nodeX(index, width);
  const y = nodeY(index);
  const side = labelSide(index, width);
  const locked = status === 'locked';
  const open = status === 'open';
  const title = t(`scenario.${scenario.id}.title`);

  const press = () => {
    if (locked) haptics.light();
    else haptics.selection();
    onPress(stage);
  };

  const faceColors: readonly [string, string] = locked
    ? home.appearance === 'dark'
      ? ['#3A3E48', '#30333C']
      : ['#EEF1F5', '#E2E7EE']
    : scenario.gradient;
  const edgeColor = locked ? (home.appearance === 'dark' ? '#202228' : '#C9D1DC') : shade(scenario.gradient[1], -0.28);

  const labelBox =
    side === 'right'
      ? { left: x + NODE / 2 + 14, right: GUTTER }
      : { left: GUTTER, right: width - (x - NODE / 2 - 14) };

  return (
    <Animated.View entering={enter.rise(80 + index * 70)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* A soft colour pool under the node, so each stage owns its bit of the road. */}
      {!locked ? (
        <View
          pointerEvents="none"
          style={[styles.pool, { left: x - NODE * 0.95, top: y - NODE * 0.95, backgroundColor: `${scenario.tint}${home.appearance === 'dark' ? '26' : '1C'}` }]}
        />
      ) : null}

      {open ? <Halo x={x} y={y} tint={scenario.tint} /> : null}
      {open ? <HereBubble x={x} y={y} tint={scenario.tint} label={t('path.current')} /> : null}

      <Pressable3D
        accessibilityRole="button"
        accessibilityLabel={`${t('path.stage', { n: stage.number })}. ${title}. ${locked ? t('path.locked') : status === 'passed' ? t('path.passed') : t('path.start')}`}
        onPress={press}
        edgeColor={edgeColor}
        depth={DEPTH}
        radius={NODE / 2}
        style={[styles.node, { left: x - NODE / 2, top: y - NODE / 2 - DEPTH / 2 }]}
        faceStyle={[styles.face, locked && styles.faceLocked]}
      >
        <LinearGradient colors={faceColors} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* Glossy top-left highlight, the light catching a rounded button. */}
        {!locked ? <View pointerEvents="none" style={styles.gloss} /> : null}
        <Ionicons
          name={locked ? 'lock-closed' : scenario.icon}
          size={locked ? 28 : 34}
          color={locked ? home.textMuted : '#FFFFFF'}
        />
      </Pressable3D>

      {status === 'passed' ? (
        <View pointerEvents="none" style={[styles.badge, { left: x + NODE / 2 - 24, top: y - NODE / 2 - 6 }]}>
          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
        </View>
      ) : null}

      {status === 'passed' ? (
        <View pointerEvents="none" style={[styles.stars, { left: x - 40, top: y + NODE / 2 + 8 }]}>
          <StarRow count={stage.stars} size={16} gap={3} />
        </View>
      ) : null}

      <PressableScale
        onPress={press}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        scaleTo={0.97}
        style={[styles.label, labelBox, { top: y - 34 }, side === 'left' ? styles.labelLeft : styles.labelRight, locked && styles.labelLocked]}
      >
        <View style={[styles.stagePill, { backgroundColor: locked ? home.track : `${scenario.tint}22` }]}>
          <AppText variant="captionStrong" color={locked ? home.textMuted : scenario.tint} style={styles.stageText} numberOfLines={1}>
            {t('path.stage', { n: stage.number }).toUpperCase()}
          </AppText>
        </View>
        <AppText variant="bodyStrong" color={locked ? home.textMuted : home.text} numberOfLines={1} style={side === 'left' && styles.alignRight}>
          {title}
        </AppText>
        <AppText variant="caption" color={home.textMuted} numberOfLines={1} style={side === 'left' && styles.alignRight}>
          {stage.best !== null ? `${t('path.best')}: ${stage.best}/10` : t(`scenario.${scenario.id}.subtitle`)}
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
    transform: [{ scale: 1 + pulse.get() * 0.55 }],
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
  const width = 132;

  return (
    <Animated.View pointerEvents="none" style={[haloStyles.bubbleBox, { left: x - width / 2, top: y - NODE / 2 - 52, width }, animated]}>
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
    pool: { position: 'absolute', width: NODE * 1.9, height: NODE * 1.9, borderRadius: NODE },
    node: { position: 'absolute', width: NODE, height: NODE + DEPTH },
    face: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.28)' },
    faceLocked: { borderColor: home.rim },
    gloss: {
      position: 'absolute',
      top: 7,
      left: 12,
      width: NODE * 0.42,
      height: NODE * 0.2,
      borderRadius: NODE,
      backgroundColor: 'rgba(255,255,255,0.28)',
      transform: [{ rotate: '-24deg' }],
    },
    badge: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#22B573',
      borderWidth: 3,
      borderColor: home.background,
    },
    stars: { position: 'absolute', width: 80, alignItems: 'center' },
    label: {
      position: 'absolute',
      gap: 2,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: home.panel,
      borderWidth: 1,
      borderColor: home.rim,
      borderBottomWidth: 3,
      borderBottomColor: home.rimBottom,
    },
    labelLeft: { alignItems: 'flex-end' },
    labelRight: { alignItems: 'flex-start' },
    labelLocked: { opacity: 0.75 },
    stagePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, marginBottom: 2 },
    stageText: { fontSize: 11, lineHeight: 15, letterSpacing: 0.8, fontWeight: '800' },
    alignRight: { textAlign: 'right' },
  });
