import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useMockAudioLevel } from '@/features/face';
import { useT } from '@/i18n';
import { haptics } from '@/services/haptics';
import { useSettingsStore } from '@/store/settingsStore';
import { useResultStore } from '@/store/resultStore';
import { useUserStore } from '@/store/userStore';
import { colors, spacing } from '@/theme';
import type { Scenario } from '@/types';

import { ActionButton } from './ActionButton';
import { AiMessageBubble } from './AiMessageBubble';
import { ConversationBackdrop } from './ConversationBackdrop';
import { ConversationHeader } from './ConversationHeader';
import { toFaceState, pickEmotion } from './emotion';
import { FloatingAvatar } from './FloatingAvatar';
import { HintCard } from './HintCard';
import { NoticeBanner } from './NoticeBanner';
import { TextComposer } from './TextComposer';
import { useConversation } from './useConversation';
import { UserTranscript } from './UserTranscript';
import { useTutorVoice } from './useTutorVoice';
import { useVoiceTurn } from './useVoiceTurn';
import { VoiceOrb } from './VoiceOrb';
import { WaveBars } from './WaveBars';

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
  const showTranscript = useSettingsStore((state) => state.showTranscript);
  const toggleTranscript = useSettingsStore((state) => state.toggleTranscript);

  const setResult = useResultStore((state) => state.setResult);
  const recordConversation = useUserStore((state) => state.recordConversation);

  const faceSize = Math.min(Math.max(height * 0.21, 140), 210);
  const emotion = pickEmotion(message);
  const tutor = useTutorVoice(message, voiceState);
  // The scripted session may report idle while the speech engine is still talking.
  const shownState = voiceState === 'idle' && tutor.speaking ? 'speaking' : voiceState;
  const waving = shownState === 'listening' || shownState === 'speaking';
  const audioLevel = useMockAudioLevel(shownState === 'speaking');
  const voice = useVoiceTurn(conversation, voiceState);

  const navigation = useNavigation();
  /** Set once the screen is allowed to close without asking again (result shown, or the user said No). */
  const exitAllowed = useRef(false);

  const handleFinish = useCallback(async () => {
    await voice.cancel();
    const result = await conversation.finish();
    if (!result) return;
    haptics.success();
    recordConversation(result.scenarioId, result.durationSec, result.overall);
    setResult(result);
    exitAllowed.current = true;
    router.replace('/result');
  }, [conversation, voice, recordConversation, setResult]);

  // Leaving by any route (back button, swipe, hardware back) asks whether to finish and show the result.
  const { hasAnswered } = conversation;
  const stopVoice = voice.cancel;
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (exitAllowed.current || !hasAnswered()) return;
        event.preventDefault();
        Alert.alert(t('conversation.exitTitle'), t('conversation.exitMessage'), [
          {
            text: t('conversation.exitNo'),
            style: 'destructive',
            onPress: () => {
              exitAllowed.current = true;
              void stopVoice();
              navigation.dispatch(event.data.action);
            },
          },
          { text: t('conversation.exitYes'), isPreferred: true, onPress: () => void handleFinish() },
        ]);
      }),
    [navigation, hasAnswered, stopVoice, handleFinish, t],
  );

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
      <ConversationBackdrop scenario={scenario} />

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <ConversationHeader
          title={t(`scenario.${scenario.id}.title`)}
          onBack={() => router.back()}
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

        <NoticeBanner notice={conversation.notice} onDismiss={conversation.dismissNotice} />

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
              <FloatingAvatar state={toFaceState(shownState)} emotion={emotion} audioLevel={audioLevel} size={faceSize} />
            </View>

            <View style={styles.messages}>
              <AiMessageBubble message={message} speaking={shownState === 'speaking'} onReplay={tutor.replay} />
              <HintCard hint={hint} />
              <UserTranscript text={conversation.learnerText} visible={showTranscript} />
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
                  <WaveBars active={waving} />
                  <VoiceOrb
                    state={voiceState}
                    onPress={voice.toggle}
                    level={voice.level}
                    accessibilityLabel={t(`voiceButton.${shownState}`)}
                  />
                  <WaveBars active={waving} mirrored />
                </View>
                <AppText variant="bodyStrong" color={colors.textSecondary} accessibilityLiveRegion="polite">
                  {t(`voice.${shownState}`)}
                </AppText>
                <View style={styles.actions}>
                  <ActionButton icon="keypad-outline" label={t('conversation.keyboard')} onPress={() => {
                      void voice.cancel();
                      setKeyboardMode(true);
                    }} />
                  <ActionButton
                    icon={showTranscript ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                    label={t('conversation.transcript')}
                    accessibilityLabel={t(showTranscript ? 'conversation.transcriptHide' : 'conversation.transcriptShow')}
                    active={showTranscript}
                    onPress={toggleTranscript}
                  />
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
    height: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
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
    gap: spacing.xs,
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  composer: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
