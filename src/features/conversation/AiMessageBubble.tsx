import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useT } from '@/i18n';
import { colors, radii, shadows, spacing } from '@/theme';
import type { AiMessage } from '@/types';

interface AiMessageBubbleProps {
  message: AiMessage | null;
  speaking: boolean;
  /** Plays the line again. */
  onReplay?: () => void;
}

/** The tutor's Russian line in a speech bubble whose tail points up at the avatar. */
export function AiMessageBubble({ message, speaking, onReplay }: AiMessageBubbleProps) {
  const t = useT();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = speaking ? withRepeat(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), -1) : withTiming(0, { duration: 200 });
  }, [speaking, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: speaking ? 0.5 * (1 - pulse.value) : 0, transform: [{ scale: 1 + pulse.value * 0.55 }] }));

  return (
    <Animated.View
      key={message?.id ?? 'placeholder'}
      entering={FadeInDown.duration(350)}
      exiting={FadeOut.duration(120)}
      style={styles.wrap}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.tail} />
      <View style={styles.bubble}>
        <AppText variant="subheading" style={styles.text}>
          {message ? message.text : '…'}
        </AppText>
        <View style={styles.speakerWrap}>
        <Animated.View pointerEvents="none" style={[styles.ring, ring]} />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t('conversation.replay')}
          disabled={!message}
          hitSlop={8}
          onPress={onReplay}
          style={[styles.speaker, speaking && styles.speakerActive]}
        >
          <Ionicons name={speaking ? 'volume-high' : 'volume-medium'} size={20} color={speaking ? colors.onPrimary : colors.primary} />
        </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
}

const TAIL = 18;

const styles = StyleSheet.create({
  wrap: { paddingTop: TAIL / 2 },
  tail: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -TAIL / 2,
    width: TAIL,
    height: TAIL,
    borderRadius: 4,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadows.raised,
  },
  text: { flex: 1, fontWeight: '600' },
  speaker: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  speakerWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.primary },
  speakerActive: { backgroundColor: colors.primary },
});
