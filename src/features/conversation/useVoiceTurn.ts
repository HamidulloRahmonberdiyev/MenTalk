import { useCallback, useEffect, useRef } from 'react';
import { Alert, Linking } from 'react-native';

import { useT } from '@/i18n';
import type { VoiceState } from '@/types';

import type { useConversation } from './useConversation';
import { useVoiceCapture } from './useVoiceCapture';

type Conversation = ReturnType<typeof useConversation>;

/** Lets the tutor's voice die away in the room before the mic opens, so it is not taken for the learner. */
const SETTLE_MS = 250;
/** Answering in a language one is still learning can take a moment's thought; a mic opened for the learner waits this long. */
const PATIENT_NO_SPEECH_MS = 15_000;

/**
 * Connects the microphone to the conversation. The learner taps the mic to talk (or to interrupt the
 * tutor); in hands-free use `listenAfterTutor` opens it by itself once the tutor has finished a line.
 * Either way the turn ends by itself when the learner stops talking (or on a tap), and the recorded
 * voice goes to the tutor.
 */
export function useVoiceTurn(conversation: Conversation, voiceState: VoiceState) {
  const t = useT();
  const { sendAudio, cancelListening, startListening } = conversation;

  const capture = useVoiceCapture({ onSpeechEnd: sendAudio, onNoSpeech: cancelListening });
  const { start, stop, abort } = capture;
  const state = useRef(voiceState);
  /** The mic is about to open for the learner: "listening" already shows, the recorder starts after `SETTLE_MS`. */
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The learner refused the microphone: it is not opened for them again, nor are they asked again unprompted. */
  const refused = useRef(false);

  useEffect(() => {
    state.current = voiceState;
  }, [voiceState]);

  const clearSettling = useCallback(() => {
    if (settling.current) clearTimeout(settling.current);
    settling.current = null;
  }, []);

  useEffect(() => clearSettling, [clearSettling]);

  /** Opens the recorder. A tap shows any problem; an unprompted opening fails quietly. */
  const open = useCallback(
    async (unprompted: boolean) => {
      const opened = await start(unprompted ? { noSpeechMs: PATIENT_NO_SPEECH_MS, unprompted } : undefined);
      if (opened === 'started') return;

      cancelListening();
      if (opened === 'denied') {
        const asked = refused.current;
        refused.current = true;
        if (unprompted && asked) return;
        Alert.alert(t('voice.permissionTitle'), t('voice.permissionMessage'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('voice.openSettings'), onPress: () => void Linking.openSettings() },
        ]);
      } else if (!unprompted) {
        Alert.alert(t('error.title'), t('voice.startFailed'));
      }
    },
    [start, cancelListening, t],
  );

  const toggle = useCallback(async () => {
    if (state.current === 'listening') {
      // Tapped before the recorder even opened: the learner does not want the mic now.
      if (settling.current) {
        clearSettling();
        cancelListening();
        return;
      }
      await stop();
      return;
    }
    if (state.current !== 'idle' && state.current !== 'speaking') return;

    // Show "listening" at once; opening the recorder takes a moment and must not make the tap feel laggy.
    clearSettling();
    refused.current = false;
    startListening();
    await open(false);
  }, [stop, startListening, cancelListening, clearSettling, open]);

  /** The tutor has finished a line: the learner's turn, without a tap. */
  const listenAfterTutor = useCallback(() => {
    if (refused.current || settling.current) return;
    if (state.current !== 'idle' && state.current !== 'speaking') return;
    startListening();
    settling.current = setTimeout(() => {
      settling.current = null;
      // Left in the meantime (keyboard, leaving the chat): the mic stays closed.
      if (state.current === 'listening') void open(true);
    }, SETTLE_MS);
  }, [startListening, open]);

  /** Closes the mic and leaves the listening state without a reply (keyboard mode, finishing). */
  const cancel = useCallback(async () => {
    clearSettling();
    await abort();
    cancelListening();
  }, [abort, cancelListening, clearSettling]);

  return { toggle, listenAfterTutor, cancel, level: capture.level };
}
