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
import { TutorAvatar } from '@/components/ui/TutorAvatar';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useResultStore } from '@/store/resultStore';
import { useUserStore } from '@/store/userStore';
import { colors, spacing } from '@/theme';
import type { Scenario } from '@/types';

import { ActionButton } from './ActionButton';
import { AiMessageBubble } from './AiMessageBubble';
import { Float3D } from './Float3D';
import { HintCard } from './HintCard';
import { TextComposer } from './TextComposer';
import { useConversation } from './useConversation';
import { VoiceOrb } from './VoiceOrb';
import { Waveform } from './Waveform';

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

  const avatarSize = Math.min(Math.max(height * 0.26, 150), 250);

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
        colors={[scenario.gradient[1], scenario.gradient[0], colors.background]}
        locations={[0, 0.45, 1]}
        style={[styles.backdrop, { height: height * 0.62 }]}
      />

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <ScreenHeader
          inverted
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
                <AppText variant="captionStrong" color="#FFFFFF">
                  {finishing ? '…' : t('conversation.finishShort')}
                </AppText>
              </PressableScale>
            ) : null
          }
        />

        {status === 'connecting' ? (
          <LoadingView label={t('conversation.connecting')} inverted />
        ) : status === 'error' ? (
          <ErrorView
            message={conversation.errorMessage ?? t('error.unknown')}
            onRetry={conversation.retry}
          />
        ) : (
          <Animated.View entering={FadeIn.duration(400)} style={styles.stage}>
            <View style={styles.avatarWrap}>
              <Float3D active={voiceState === 'speaking'}>
                <TutorAvatar size={avatarSize} speaking={voiceState === 'speaking'} />
              </Float3D>
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
                  <Waveform active={voiceState === 'listening' || voiceState === 'speaking'} />
                  <VoiceOrb
                    state={voiceState}
                    onPress={handleMicPress}
                    accessibilityLabel={t(`voiceButton.${voiceState}`)}
                  />
                  <Waveform active={voiceState === 'listening' || voiceState === 'speaking'} mirrored />
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
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  stage: {
    flex: 1,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: -spacing.xl,
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
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
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
