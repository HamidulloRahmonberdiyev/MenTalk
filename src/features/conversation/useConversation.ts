import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '@/i18n';
import { conversationService, type ConversationSession } from '@/services/conversation';
import type { AiMessage, ConversationResult, Scenario, VoiceState } from '@/types';

export type ConnectionStatus = 'connecting' | 'ready' | 'error';
export type HintState =
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'shown'; text: string };

const HIDDEN_HINT: HintState = { status: 'hidden' };

/** Binds a `ConversationSession` to React state. Contains no provider-specific code. */
export function useConversation(scenario: Scenario) {
  const t = useT();
  const sessionRef = useRef<ConversationSession | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [message, setMessage] = useState<AiMessage | null>(null);
  const [hint, setHint] = useState<HintState>(HIDDEN_HINT);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    const session = conversationService.createSession(scenario);
    sessionRef.current = session;
    const unsubscribe = session.subscribe((event) => {
      switch (event.type) {
        case 'state':
          setVoiceState(event.state);
          break;
        case 'aiMessage':
          setMessage(event.message);
          setHint(HIDDEN_HINT);
          break;
        case 'error':
          setErrorMessage(event.message);
          setStatus('error');
          break;
      }
    });

    session
      .connect()
      .then(() => setStatus((current) => (current === 'error' ? current : 'ready')))
      .catch(() => {
        setErrorMessage(t('error.connect'));
        setStatus('error');
      });

    return () => {
      unsubscribe();
      session.dispose();
      sessionRef.current = null;
    };
  }, [scenario, attempt, t]);

  const retry = useCallback(() => {
    setStatus('connecting');
    setErrorMessage(null);
    setVoiceState('idle');
    setMessage(null);
    setHint(HIDDEN_HINT);
    setAttempt((value) => value + 1);
  }, []);

  const startListening = useCallback(() => sessionRef.current?.startListening(), []);
  const stopListening = useCallback(() => sessionRef.current?.stopListening(), []);
  const sendText = useCallback((text: string) => sessionRef.current?.sendText(text), []);

  const toggleHint = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    if (hint.status !== 'hidden') {
      setHint(HIDDEN_HINT);
      return;
    }
    setHint({ status: 'loading' });
    try {
      const text = await session.requestHint();
      setHint({ status: 'shown', text });
    } catch {
      setHint(HIDDEN_HINT);
    }
  }, [hint.status]);

  const finish = useCallback(async (): Promise<ConversationResult | null> => {
    const session = sessionRef.current;
    if (!session || finishing) return null;
    setFinishing(true);
    try {
      return await session.end();
    } catch {
      setErrorMessage(t('error.finish'));
      setStatus('error');
      return null;
    } finally {
      setFinishing(false);
    }
  }, [finishing, t]);

  return {
    status,
    errorMessage,
    voiceState,
    message,
    hint,
    finishing,
    retry,
    startListening,
    stopListening,
    sendText,
    toggleHint,
    finish,
  };
}
