import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { easing, enter } from '@/theme/motion';

import { GOLD } from './color';

interface PathHeroProps {
  passed: number;
  total: number;
  stars: number;
}

/** The banner over the path: how far along the learner is, as a bar and a star count. */
export function PathHero({ passed, total, stars }: PathHeroProps) {
  const t = useT();
  const share = total ? passed / total : 0;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(withDelay(250, withTiming(share, { duration: 900, easing: easing.out })));
  }, [fill, share]);

  const bar = useAnimatedStyle(() => ({ width: `${Math.max(fill.get(), 0.04) * 100}%` }));

  return (
    <Animated.View entering={enter.rise()} style={styles.wrap}>
      <LinearGradient colors={['#4FB8F2', '#3A7BEA', '#6B4FE0']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* Decorative orbs: depth without imagery. */}
        <View pointerEvents="none" style={[styles.orb, styles.orbA]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbB]} />
        <View pointerEvents="none" style={[styles.orb, styles.orbC]} />

        <View style={styles.top}>
          <View style={styles.texts}>
            <AppText variant="title" color="#FFFFFF" numberOfLines={2} style={styles.title}>
              {t('path.title')}
            </AppText>
            <AppText variant="captionStrong" color="rgba(255,255,255,0.88)">
              {t('path.progress', { done: passed, total })}
            </AppText>
          </View>
          <View style={styles.trophy}>
            <Ionicons name="trophy" size={30} color={GOLD} />
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, bar]}>
              <LinearGradient colors={['#FFE07A', GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <View style={styles.fillShine} />
            </Animated.View>
          </View>
          <View style={styles.starChip}>
            <Ionicons name="star" size={14} color={GOLD} />
            <AppText variant="captionStrong" color="#FFFFFF">
              {stars}/{total * 3}
            </AppText>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    boxShadow: '0 14px 30px rgba(58, 100, 234, 0.32)',
  },
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  orbA: { width: 180, height: 180, top: -70, right: -50 },
  orbB: { width: 90, height: 90, bottom: -36, left: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  orbC: { width: 26, height: 26, top: 22, right: 120, backgroundColor: 'rgba(255,255,255,0.18)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 4 },
  title: { fontSize: 26, lineHeight: 31 },
  trophy: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: {
    flex: 1,
    height: 14,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(8, 20, 60, 0.25)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  fillShine: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  starChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(8, 20, 60, 0.25)',
  },
});
