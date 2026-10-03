import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

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
    backgroundColor: colors.surface,
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
  speakerActive: { backgroundColor: colors.primary },
});
