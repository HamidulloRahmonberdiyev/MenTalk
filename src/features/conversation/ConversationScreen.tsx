import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { PressableScale } from '@/components/ui/PressableScale';
import { ErrorView, LoadingView } from '@/components/ui/StateViews';
import { useLipSync } from '@/features/face';
import { useSavedWords } from '@/features/vocabulary/useSavedWords';
import type { WordRequest } from '@/features/vocabulary/useWordLookup';
import { useVocabularyStore } from '@/features/vocabulary/vocabularyStore';
import { WordSheet } from '@/features/vocabulary/WordSheet';
import { sentenceOf } from '@/features/vocabulary/words';
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
import { usePalette, useThemedStyles, type Palette } from '@/theme/appearance';

interface ConversationScreenProps {
  scenario: Scenario;
}

export function ConversationScreen({ scenario }: ConversationScreenProps) {
  const home = usePalette();
  const styles = useThemedStyles(createStyles);
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const conversation = useConversation(scenario);
  const { status, voiceState, message, hint, finishing } = conversation;
  const [keyboardMode, setKeyboardMode] = useState(false);
  const [wordRequest, setWordRequest] = useState<WordRequest | null>(null);
  const savedWords = useSavedWords();
  const tipSeen = useVocabularyStore((state) => state.tipSeen);
  const showTranscript = useSettingsStore((state) => state.showTranscript);
  const toggleTranscript = useSettingsStore((state) => state.toggleTranscript);

  const setResult = useResultStore((state) => state.setResult);
  const recordConversation = useUserStore((state) => state.recordConversation);

  const faceSize = Math.min(Math.max(Math.min(height * 0.24, width * 0.52), 130), 220);
  const emotion = pickEmotion(message);
  const lipSync = useLipSync();
  const tutor = useTutorVoice(message, voiceState, lipSync);
  // The scripted session may report idle while the speech engine is still talking.
  const shownState = voiceState === 'idle' && tutor.speaking ? 'speaking' : voiceState;
  const waving = shownState === 'listening' || shownState === 'speaking';
  const voice = useVoiceTurn(conversation, voiceState);

  const navigation = useNavigation();
  /** Set once the screen is allowed to close without asking again (result shown, or the user said No). */
  const exitAllowed = useRef(false);

  /** Scores the conversation and stores the result; false if that failed (the screen shows the error). */
  const completeConversation = useCallback(async (): Promise<boolean> => {
    await voice.cancel();
    const result = await conversation.finish();
    if (!result) return false;
    haptics.success();
    recordConversation(result.scenarioId, result.durationSec, result.overall);
    setResult(result);
    exitAllowed.current = true;
    return true;
  }, [conversation, voice, recordConversation, setResult]);

  const handleFinish = useCallback(async () => {
    if (await completeConversation()) router.replace('/result');
  }, [completeConversation]);

  // Leaving by any route (back button, swipe, hardware back) asks whether to finish and show the result.
  const { hasAnswered } = conversation;
  const stopVoice = voice.cancel;
  /** The navigation that was held back to ask first; replayed if the learner leaves anyway. */
  const [exitAction, setExitAction] = useState<Parameters<typeof navigation.dispatch>[0] | null>(null);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  /** Where to go once the sheet has slid away, so the next screen never appears under it. */
  const afterExitPrompt = useRef<'result' | 'leave' | null>(null);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (exitAllowed.current || !hasAnswered()) return;
        event.preventDefault();
        setExitAction(event.data.action);
        setExitPromptOpen(true);
      }),
    [navigation, hasAnswered],
  );

  const finishFromPrompt = useCallback(async () => {
    if (await completeConversation()) afterExitPrompt.current = 'result';
    setExitPromptOpen(false);
  }, [completeConversation]);

  const leaveWithoutSaving = useCallback(() => {
    afterExitPrompt.current = 'leave';
    setExitPromptOpen(false);
  }, []);

  const exitPromptClosed = useCallback(() => {
    const next = afterExitPrompt.current;
    afterExitPrompt.current = null;
    setExitAction(null);
    if (next === 'result') {
      router.replace('/result');
    } else if (next === 'leave' && exitAction) {
      exitAllowed.current = true;
      void stopVoice();
      navigation.dispatch(exitAction);
    }
  }, [exitAction, navigation, stopVoice]);

  const messageText = message?.text ?? '';
  const handleWordPress = useCallback(
    (word: string) => {
      haptics.selection();
      setWordRequest({ word, sentence: sentenceOf(messageText, word) });
    },
    [messageText],
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
                <AppText variant="captionStrong" color={home.accent}>
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
              <FloatingAvatar state={toFaceState(shownState)} emotion={emotion} speech={lipSync.face} size={faceSize} />
            </View>

            <View style={styles.messages}>
              <AiMessageBubble
                message={message}
                speaking={shownState === 'speaking'}
                onReplay={tutor.replay}
                onWordPress={handleWordPress}
                savedWords={savedWords}
                showTip={!tipSeen}
              />
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
                  <WaveBars active={waving} level={shownState === 'speaking' ? lipSync.face.energy : voice.level} />
                  <VoiceOrb
                    state={voiceState}
                    onPress={voice.toggle}
                    level={voice.level}
                    accessibilityLabel={t(`voiceButton.${shownState}`)}
                  />
                  <WaveBars active={waving} mirrored level={shownState === 'speaking' ? lipSync.face.energy : voice.level} />
                </View>
                <AppText variant="bodyStrong" color={home.textSecondary} accessibilityLiveRegion="polite">
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
      <WordSheet request={wordRequest} onClose={() => setWordRequest(null)} />
      <ConfirmSheet
        visible={exitPromptOpen}
        icon="flag-outline"
        title={t('conversation.exitTitle')}
        message={t('conversation.exitMessage')}
        confirmLabel={t('conversation.exitFinish')}
        cancelLabel={t('conversation.exitLeave')}
        loading={finishing}
        onConfirm={() => void finishFromPrompt()}
        onCancel={leaveWithoutSaving}
        onDismiss={() => setExitPromptOpen(false)}
        onClosed={exitPromptClosed}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (home: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.background,
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
    backgroundColor: home.panel,
  },
  stage: {
    flex: 1,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: -spacing.md,
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
