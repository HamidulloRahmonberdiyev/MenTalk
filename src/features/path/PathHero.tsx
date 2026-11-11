import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { radii, spacing } from '@/theme';
import { easing, enter } from '@/theme/motion';

import { ACCENT, GOLD } from './color';

const HERO = require('../../../assets/path/hero.jpg');
const RING = 64;
const STROKE = 6;

interface PathHeroProps {
  passed: number;
  total: number;
  stars: number;
}

/** The banner over the path: a journey photo, how far along the learner is as a ring and a bar, and the star count. */
export function PathHero({ passed, total, stars }: PathHeroProps) {
  const t = useT();
  const share = total ? passed / total : 0;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(withDelay(250, withTiming(share, { duration: 900, easing: easing.out })));
  }, [fill, share]);

  const bar = useAnimatedStyle(() => ({ width: `${Math.max(fill.get(), 0.03) * 100}%` }));

  const radius = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <Animated.View entering={enter.rise()} style={styles.wrap}>
      <View style={styles.card}>
        <Image source={HERO} contentFit="cover" contentPosition="right" style={StyleSheet.absoluteFill} />
        {/* Deep navy wash from the text side, so the copy reads while the photo still shows through. */}
        <LinearGradient
          colors={['rgba(6,18,40,0.92)', 'rgba(6,18,40,0.62)', 'rgba(6,18,40,0.15)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={['rgba(6,18,40,0)', 'rgba(6,18,40,0.7)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />

        <View style={styles.top}>
          <View style={styles.texts}>
            <View style={styles.overline}>
              <Ionicons name="map" size={12} color={ACCENT} />
              <AppText variant="captionStrong" color="rgba(255,255,255,0.75)" style={styles.overlineText}>
                {t('path.overline').toUpperCase()}
              </AppText>
            </View>
            <AppText variant="title" color="#FFFFFF" numberOfLines={2} style={styles.title}>
              {t('path.title')}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              {t('path.progress', { done: passed, total })}
            </AppText>
          </View>

          <View style={styles.ring}>
            <Svg width={RING} height={RING}>
              <Circle cx={RING / 2} cy={RING / 2} r={radius} stroke="rgba(255,255,255,0.18)" strokeWidth={STROKE} fill="rgba(6,18,40,0.45)" />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={radius}
                stroke={ACCENT}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - share)}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>
            <View style={styles.ringLabel}>
              <AppText variant="bodyStrong" color="#FFFFFF" style={styles.percent}>
                {Math.round(share * 100)}%
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, bar]}>
              <LinearGradient colors={['#7FD3FA', ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
          <View style={styles.starChip}>
            <Ionicons name="star" size={13} color={GOLD} />
            <AppText variant="captionStrong" color="#FFFFFF">
              {stars}/{total * 3}
            </AppText>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    boxShadow: '0 14px 30px rgba(6, 18, 40, 0.28)',
  },
  card: {
    minHeight: 196,
    borderRadius: radii.xl,
    overflow: 'hidden',
    padding: spacing.xl,
    justifyContent: 'space-between',
    gap: spacing.lg,
    backgroundColor: '#0B1F3A',
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  texts: { flex: 1, gap: 4 },
  overline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginBottom: 2,
  },
  overlineText: { fontSize: 10, lineHeight: 14, letterSpacing: 1.4, fontWeight: '800' },
  title: { fontSize: 26, lineHeight: 31 },
  ring: { width: RING, height: RING },
  ringLabel: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 15, fontWeight: '800' },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  starChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
});
