import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, shadows, spacing } from '@/theme';
import type { AiMessage } from '@/types';

interface AiMessageBubbleProps {
  message: AiMessage | null;
  speaking: boolean;
}

export function AiMessageBubble({ message, speaking }: AiMessageBubbleProps) {
  return (
    <Animated.View
      key={message?.id ?? 'placeholder'}
      entering={FadeInDown.duration(350)}
      exiting={FadeOut.duration(120)}
      style={styles.bubble}
      accessibilityLiveRegion="polite"
    >
      <AppText variant="subheading" style={styles.text}>
        {message ? message.text : '…'}
      </AppText>
      <View style={[styles.speaker, speaking && styles.speakerActive]}>
        <Ionicons
          name={speaking ? 'volume-high' : 'volume-medium'}
          size={20}
          color={colors.primary}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  text: {
    flex: 1,
    fontWeight: '500',
  },
  speaker: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  speakerActive: {
    backgroundColor: colors.primarySoft,
  },
});
