import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette } from '@/theme/appearance';

import { GOLD_DEEP } from './color';

const CUP_ART = require('@/assets/icons3d/cup.png');
const SIZE = 124;

interface FinishCupProps {
  x: number;
  y: number;
  done: boolean;
  delay: number;
}

/**
 * The end of the road: the 3D golden cup glowing once every stage is passed; until then the same cup
 * as a quiet silhouette with a lock, so the learner sees exactly what is waiting for them.
 */
export function FinishCup({ x, y, done, delay }: FinishCupProps) {
  const home = usePalette();
  const t = useT();
  const dark = home.appearance === 'dark';

  return (
    <Animated.View entering={enter.rise(delay)} style={[styles.box, { left: x - 110, top: y - SIZE / 2 }]} pointerEvents="none">
      <View style={styles.art}>
        {done ? <View style={styles.glow} /> : <View style={[styles.plate, { backgroundColor: home.track, borderColor: home.rim }]} />}
        <View style={[styles.floor, { backgroundColor: done ? 'rgba(240, 154, 12, 0.28)' : dark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(16, 24, 40, 0.1)' }]} />
        <Image
          source={CUP_ART}
          style={styles.cup}
          contentFit="contain"
          transition={150}
          // Until the end is reached the cup is only its outline, in the page's quiet grey.
          tintColor={done ? undefined : dark ? '#3D414C' : '#D3DAE4'}
        />
        {!done ? (
          <View style={[styles.lock, { borderColor: home.background }]}>
            <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <AppText variant="bodyStrong" color={done ? GOLD_DEEP : home.text} style={styles.text}>
        {done ? t('path.finish.done') : t('path.finish.title')}
      </AppText>
      {!done ? (
        <AppText variant="caption" color={home.textMuted} style={styles.text} numberOfLines={2}>
          {t('path.finish.text')}
        </AppText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', width: 220, alignItems: 'center', gap: 4 },
  art: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  glow: {
    position: 'absolute',
    width: SIZE * 0.78,
    height: SIZE * 0.78,
    borderRadius: SIZE,
    backgroundColor: 'rgba(255, 210, 90, 0.35)',
    boxShadow: '0 0 36px 14px rgba(255, 194, 51, 0.45)',
  },
  plate: { position: 'absolute', width: SIZE * 0.92, height: SIZE * 0.92, borderRadius: SIZE, borderWidth: 2 },
  floor: { position: 'absolute', bottom: 6, width: SIZE * 0.46, height: 10, borderRadius: SIZE },
  cup: { width: SIZE * 0.86, height: SIZE * 0.86 },
  lock: {
    position: 'absolute',
    right: SIZE * 0.14,
    bottom: SIZE * 0.1,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    backgroundColor: '#9AA3B2',
  },
  text: { textAlign: 'center' },
});
