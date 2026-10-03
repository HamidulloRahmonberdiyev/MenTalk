import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';

import { useT } from '@/i18n';
import type { VoiceState } from '@/types';

import type { useConversation } from './useConversation';
import { useVoiceCapture } from './useVoiceCapture';

type Conversation = ReturnType<typeof useConversation>;

/**
 * Connects the microphone to the conversation: tapping the mic opens it, the turn ends by itself
 * after the user stops talking (or on a second tap), and the recorded voice goes to the tutor.
 */
export function useVoiceTurn(conversation: Conversation, voiceState: VoiceState) {
  const t = useT();
  const { sendAudio, cancelListening, startListening } = conversation;

  const capture = useVoiceCapture({ onSpeechEnd: sendAudio, onNoSpeech: cancelListening });
  const { start, stop, abort } = capture;

  const toggle = useCallback(async () => {
    if (voiceState === 'listening') {
      await stop();
      return;
    }
    if (voiceState !== 'idle' && voiceState !== 'speaking') return;

    const opened = await start();
    if (opened) {
      startListening();
      return;
    }
    Alert.alert(t('voice.permissionTitle'), t('voice.permissionMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('voice.openSettings'), onPress: () => void Linking.openSettings() },
    ]);
  }, [voiceState, start, stop, startListening, t]);

  /** Closes the mic and leaves the listening state without a reply (keyboard mode, finishing). */
  const cancel = useCallback(async () => {
    await abort();
    cancelListening();
  }, [abort, cancelListening]);

  return { toggle, cancel, level: capture.level };
}
