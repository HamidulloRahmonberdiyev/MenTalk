import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { TelegramLogo } from '@/components/ui/TelegramLogo';
import { colors, radii } from '@/theme';

const SIZE = 104;
const APP_ICON = require('../../../assets/images/icon.png');

const ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.6 }, { rotate: '-12deg' }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }], easing: Easing.out(Easing.back(1.6)) },
})
  .duration(520)
  .delay(80);

const EXIT = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.7 }], easing: Easing.in(Easing.quad) },
}).duration(180);

/**
 * The emblem over the sign-in screen: the MenTalk icon floating on a soft halo, which turns into the
 * Telegram logo sending out "waiting" ripples while the person confirms in the bot.
 */
export const AuthHero = memo(function AuthHero({ variant }: { variant: 'app' | 'telegram' }) {
  const float = useSharedValue(0);
  const rippleA = useSharedValue(0);
  const rippleB = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.sin) }), -1, true);
    rippleA.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
    rippleB.value = withDelay(1200, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [float, rippleA, rippleB]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (float.value - 0.5) * 8 }, { rotate: `${(float.value - 0.5) * 2}deg` }],
  }));

  return (
    <Animated.View style={[styles.wrap, floatStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ripple progress={rippleA} strong={variant === 'telegram'} />
      {variant === 'telegram' ? <Ripple progress={rippleB} strong /> : null}
      {variant === 'app' ? (
        <Animated.View key="app" entering={ENTER} exiting={EXIT} style={styles.appEdge}>
          <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" />
        </Animated.View>
      ) : (
        <Animated.View key="telegram" entering={ENTER} exiting={EXIT} style={styles.telegram}>
          <TelegramLogo size={SIZE} />
        </Animated.View>
      )}
    </Animated.View>
  );
});

function Ripple({ progress, strong }: { progress: SharedValue<number>; strong: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: (strong ? 0.5 : 0.32) * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * (strong ? 0.6 : 0.4) }],
  }));
  return <Animated.View style={[styles.ripple, style]} />;
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', width: SIZE, height: SIZE + 6, alignItems: 'center', justifyContent: 'flex-start' },
  ripple: {
    position: 'absolute',
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  // Same chunky edge as the app's buttons, in the icon's own deep blue.
  appEdge: {
    width: SIZE,
    height: SIZE + 6,
    paddingBottom: 6,
    borderRadius: radii.xl + 2,
    backgroundColor: '#0A5CD8',
    boxShadow: '0 14px 34px rgba(42, 171, 238, 0.32)',
  },
  appIcon: { width: SIZE, height: SIZE, borderRadius: radii.xl + 2 },
  telegram: { width: SIZE, height: SIZE, borderRadius: radii.pill, boxShadow: '0 14px 34px rgba(42, 171, 238, 0.4)' },
});
