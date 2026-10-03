import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useResultStore } from '@/store/resultStore';
import { useUserStore } from '@/store/userStore';
import { colors, spacing } from '@/theme';
import type { Scenario } from '@/types';

import { ActionButton } from './ActionButton';
import { AiMessageBubble } from './AiMessageBubble';
import { EmojiAvatar } from './EmojiAvatar';
import { pickEmoji } from './emotion';
import { HintCard } from './HintCard';
import { TextComposer } from './TextComposer';
import { useConversation } from './useConversation';
import { VoiceOrb } from './VoiceOrb';

interface ConversationScreenProps {
  scenario: Scenario;
}

export function ConversationScreen({ scenario }: ConversationScreenProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const conversation = useConversation(scenario);
  const { status, voiceState, message, hint, finishing } = conversation;
  const [keyboardMode, setKeyboardMode] = useState(false);

  const setResult = useResultStore((state) => state.setResult);
  const recordConversation = useUserStore((state) => state.recordConversation);

  const avatarSize = Math.min(Math.max(height * 0.2, 120), 180);
  const emoji = pickEmoji(voiceState, message?.text);

  const handleFinish = useCallback(async () => {
    const result = await conversation.finish();
    if (!result) return;
    haptics.success();
    recordConversation(result.scenarioId, result.durationSec, result.overall);
    setResult(result);
    router.replace('/result');
  }, [conversation, recordConversation, setResult]);

  const handleMicPress = useCallback(() => {
    if (voiceState === 'listening') {
      haptics.light();
      conversation.stopListening();
    } else if (voiceState === 'idle' || voiceState === 'speaking') {
      haptics.medium();
      conversation.startListening();
    }
  }, [voiceState, conversation]);

  const handleSendText = useCallback(
    (text: string) => {
      conversation.sendText(text);
      setKeyboardMode(false);
    },
    [conversation],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      style={styles.root}
    >
      <LinearGradient
        colors={[colors.primarySoft, colors.background]}
        style={[styles.backdrop, { height: height * 0.5 }]}
      />

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <ScreenHeader
          title={t(`scenario.${scenario.id}.title`)}
          onBack={() => router.back()}
          style={styles.header}
          right={
            status === 'ready' ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('conversation.finish')}
                disabled={finishing}
                hitSlop={8}
                onPress={handleFinish}
                style={styles.finish}
              >
                <AppText variant="captionStrong" color={colors.primaryDark}>
                  {finishing ? '…' : t('conversation.finishShort')}
                </AppText>
              </PressableScale>
            ) : null
          }
        />

        {status === 'connecting' ? (
          <LoadingView label={t('conversation.connecting')} />
        ) : status === 'error' ? (
          <ErrorView
            message={conversation.errorMessage ?? t('error.unknown')}
            onRetry={conversation.retry}
          />
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.stage}>
            <View style={styles.avatarWrap}>
              <EmojiAvatar emoji={emoji} size={avatarSize} speaking={voiceState === 'speaking'} />
            </View>

            <View style={styles.messages}>
              <AiMessageBubble message={message} speaking={voiceState === 'speaking'} />
              <HintCard hint={hint} />
            </View>

            <View style={styles.spacer} />

            {keyboardMode ? (
              <View style={styles.composer}>
                <TextComposer onSend={handleSendText} disabled={voiceState === 'thinking'} />
                <PressableScale onPress={() => setKeyboardMode(false)} accessibilityRole="button" hitSlop={8}>
                  <AppText variant="captionStrong" color={colors.primary} style={styles.center}>
                    {t('conversation.voiceMode')}
                  </AppText>
                </PressableScale>
              </View>
            ) : (
              <View style={styles.controls}>
                <View style={styles.micRow}>
                  <VoiceOrb
                    state={voiceState}
                    onPress={handleMicPress}
                    accessibilityLabel={t(`voiceButton.${voiceState}`)}
                  />
                </View>
                <AppText variant="bodyStrong" color={colors.textSecondary} accessibilityLiveRegion="polite">
                  {t(`voice.${voiceState}`)}
                </AppText>
                <View style={styles.actions}>
                  <ActionButton icon="keypad-outline" label={t('conversation.keyboard')} onPress={() => setKeyboardMode(true)} />
                  <ActionButton
                    icon="bulb-outline"
                    label={t('conversation.hint')}
                    active={hint.status !== 'hidden'}
                    onPress={conversation.toggleHint}
                  />
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginTop: spacing.xs,
  },
  finish: {
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  stage: {
    flex: 1,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  messages: {
    gap: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  controls: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  micRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: spacing.xxxl,
    paddingTop: spacing.sm,
  },
  composer: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
