import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { easing, enter } from '@/theme/motion';

import { GOLD } from './color';

/**
 * The same face as the path card on home (soft lavender, raised on a darker edge, the 3D signpost),
 * so the card the learner tapped opens onto a page that starts with it.
 */
const RADIUS = 34;
const DEPTH = 6;
const FACE = ['#A396DE', '#C9C3EE'] as const;
const EDGE = '#8576D4';
const DEEP = '#7462CF';
/** Dark tint for the empty progress track, in the card's own purple. */
const SHADE = 'rgba(52, 34, 130, 0.2)';
const SIGN_ART = require('@/assets/icons3d/road-sign-card.png');
const SIGN = 124;

interface PathHeroProps {
  passed: number;
  total: number;
  stars: number;
}

/** The banner over the path: the title, how many stages are passed, a progress bar and the star count. */
export function PathHero({ passed, total, stars }: PathHeroProps) {
  const t = useT();
  const share = total ? passed / total : 0;
  const progress = t('path.progress', { done: passed, total });
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(withDelay(250, withTiming(share, { duration: 900, easing: easing.out })));
  }, [fill, share]);

  const bar = useAnimatedStyle(() => ({ width: `${Math.max(fill.get(), 0.04) * 100}%` }));

  return (
    <Animated.View
      entering={enter.rise()}
      accessible
      accessibilityLabel={`${t('path.title')}. ${progress}. ${t('path.stars')}: ${stars}/${total * 3}`}
      style={styles.wrap}
    >
      {/* The darker edge peeking out under the face, as on the home cards. */}
      <View style={styles.edge} />
      <LinearGradient colors={FACE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Quiet light shapes for depth. */}
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />

        {/* The 3D signpost: a soft halo behind it, a shadow pooled under its base. */}
        <View style={styles.sign} pointerEvents="none">
          <View style={styles.signHalo} />
          <View style={styles.signFloor} />
          <Image source={SIGN_ART} style={styles.signImage} contentFit="contain" />
        </View>

        <View style={styles.head}>
          <AppText color="#FFFFFF" numberOfLines={2} adjustsFontSizeToFit style={styles.title}>
            {t('path.title')}
          </AppText>
          <View style={styles.pill}>
            <Ionicons name="flag" size={13} color="#FFFFFF" />
            <AppText color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={styles.pillText}>
              {progress}
            </AppText>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, bar]} />
          </View>
          <AppText color="#FFFFFF" style={styles.percent}>
            {Math.round(share * 100)}%
          </AppText>
          <View style={styles.starChip}>
            <Ionicons name="star" size={14} color={GOLD} />
            <AppText color={DEEP} style={styles.starText}>
              {stars}/{total * 3}
            </AppText>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: DEPTH, borderRadius: RADIUS },
  edge: {
    position: 'absolute',
    top: DEPTH,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS,
    backgroundColor: EDGE,
  },
  card: {
    // Same height as the big home cards.
    minHeight: 196,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 2,
    justifyContent: 'space-between',
    gap: spacing.lg,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  orbA: { width: 180, height: 180, top: -70, right: -50 },
  orbB: { width: 120, height: 120, bottom: -60, left: -40, backgroundColor: 'rgba(255, 255, 255, 0.1)' },

  head: { marginRight: SIGN - spacing.md, gap: spacing.sm },
  title: { fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -0.8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: DEEP,
    boxShadow: '0 3px 8px rgba(52, 34, 130, 0.25)',
  },
  pillText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '800' },

  sign: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: SIGN,
    height: SIGN,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '6deg' }],
  },
  signHalo: {
    position: 'absolute',
    width: SIGN * 0.78,
    height: SIGN * 0.78,
    borderRadius: SIGN,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    boxShadow: '0 0 28px 10px rgba(255, 255, 255, 0.35)',
  },
  signFloor: {
    position: 'absolute',
    bottom: 2,
    width: SIGN * 0.5,
    height: 10,
    borderRadius: SIGN,
    backgroundColor: 'rgba(52, 34, 130, 0.22)',
    boxShadow: '0 0 10px 4px rgba(52, 34, 130, 0.18)',
  },
  signImage: { width: SIGN, height: SIGN },

  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: {
    flex: 1,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: SHADE,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: '#FFFFFF' },
  percent: { fontSize: 15, lineHeight: 19, fontWeight: '900' },
  starChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 8px rgba(52, 34, 130, 0.25)',
  },
  starText: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
});
