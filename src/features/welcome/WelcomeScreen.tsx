import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TutorAvatar } from '@/components/ui/TutorAvatar';
import { useT } from '@/i18n';
import { colors, radii, shadows, spacing } from '@/theme';

import { LanguageChips } from './LanguageChips';

export function WelcomeScreen() {
  const t = useT();
  const { height } = useWindowDimensions();
  const avatarSize = Math.min(Math.max(height * 0.36, 200), 340);

  return (
    <Screen>
      <LanguageChips />
      <Animated.View entering={FadeInDown.duration(500)} style={styles.copy}>
        <AppText variant="display" accessibilityRole="header">
          {t('welcome.line1')}
          {'\n'}
          <AppText variant="display" color={colors.primary}>
            {t('welcome.line2')}
          </AppText>
          {'\n'}
          {t('welcome.line3')}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={styles.description}>
          {t('welcome.description')}
        </AppText>
      </Animated.View>

      <View style={styles.hero}>
        <LinearGradient
          colors={[colors.primarySoft, 'rgba(230,244,251,0)']}
          style={[styles.halo, { width: avatarSize * 1.15, height: avatarSize * 1.15 }]}
        />
        <TutorAvatar size={avatarSize} />
        <FloatingBubble text={t('welcome.bubble')} />
      </View>

      <Button title={t('welcome.start')} icon="arrow-forward" iconPosition="right" onPress={() => router.replace('/home')} />
    </Screen>
  );
}

function FloatingBubble({ text }: { text: string }) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [offset]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Animated.View style={[styles.bubble, animatedStyle]}>
      <AppText variant="bodyStrong" color={colors.onPrimary}>
        {text}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  copy: {
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  description: {
    maxWidth: 300,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    borderRadius: radii.pill,
  },
  bubble: {
    position: 'absolute',
    top: '12%',
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.lg,
    borderBottomRightRadius: 6,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
});
