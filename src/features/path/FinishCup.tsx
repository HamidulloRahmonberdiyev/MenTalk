import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { useT } from '@/i18n';
import { spacing } from '@/theme';
import { enter } from '@/theme/motion';
import { usePalette } from '@/theme/appearance';

import { GOLD, GOLD_DEEP } from './color';

const SIZE = 96;

interface FinishCupProps {
  x: number;
  y: number;
  done: boolean;
  delay: number;
}

/** The end of the road: a golden cup once every stage is passed, a silhouette until then. */
export function FinishCup({ x, y, done, delay }: FinishCupProps) {
  const home = usePalette();
  const t = useT();
  const dark = home.appearance === 'dark';

  return (
    <Animated.View entering={enter.rise(delay)} style={[styles.box, { left: x - 110, top: y - SIZE / 2 }]} pointerEvents="none">
      <View style={[styles.cupEdge, { backgroundColor: done ? GOLD_DEEP : dark ? '#202228' : '#C9D1DC' }]}>
        <LinearGradient
          colors={done ? ['#FFE58A', GOLD] : dark ? ['#3A3E48', '#30333C'] : ['#EEF1F5', '#E2E7EE']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.cup}
        >
          <Ionicons name="trophy" size={44} color={done ? '#FFFFFF' : home.textMuted} />
        </LinearGradient>
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
  cupEdge: { width: SIZE, height: SIZE + 8, borderRadius: SIZE / 2, marginBottom: spacing.sm },
  cup: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  text: { textAlign: 'center' },
});
