import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '@/i18n';
import {
  conversationService,
  type ConversationSession,
  type NoticeCode,
  type RecordedAudio,
} from '@/services/conversation';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import type { AiMessage, ConversationResult, LearnerProfile, Scenario, VoiceState } from '@/types';

export type ConnectionStatus = 'connecting' | 'ready' | 'error';
export type HintState =
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'shown'; text: string };

const HIDDEN_HINT: HintState = { status: 'hidden' };

function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1;
  return age;
}

/** Snapshot of who is talking, taken when a session starts. */
function currentLearner(): LearnerProfile {
  const user = useUserStore.getState();
  return {
    name: user.name,
    gender: user.gender,
    age: ageFrom(user.birthDate),
    level: user.level,
    goals: user.goals,
    uiLanguage: useSettingsStore.getState().language,
  };
}

/** Binds a `ConversationSession` to React state. Contains no provider-specific code. */
export function useConversation(scenario: Scenario) {
  const t = useT();
  const sessionRef = useRef<ConversationSession | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [message, setMessage] = useState<AiMessage | null>(null);
  const [learnerText, setLearnerText] = useState<string | null>(null);
  const [hint, setHint] = useState<HintState>(HIDDEN_HINT);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<{ code: NoticeCode; id: number } | null>(null);

  useEffect(() => {
    const session = conversationService.createSession(scenario, currentLearner());
    sessionRef.current = session;
    const unsubscribe = session.subscribe((event) => {
      switch (event.type) {
        case 'state':
          setVoiceState(event.state);
          // A new turn starts: the previous sentence is no longer news.
          if (event.state === 'listening') setLearnerText(null);
          break;
        case 'learnerMessage':
          setLearnerText(event.text);
          break;
        case 'aiMessage':
          setMessage(event.message);
          setHint(HIDDEN_HINT);
          break;
        case 'notice':
          setNotice({ code: event.code, id: Date.now() });
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
    setLearnerText(null);
    setHint(HIDDEN_HINT);
    setAttempt((value) => value + 1);
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const startListening = useCallback(() => sessionRef.current?.startListening(), []);
  const stopListening = useCallback(() => sessionRef.current?.stopListening(), []);
  const sendAudio = useCallback((audio: RecordedAudio) => sessionRef.current?.sendAudio(audio), []);
  const cancelListening = useCallback(() => sessionRef.current?.cancelListening(), []);
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
    learnerText,
    hint,
    finishing,
    notice,
    dismissNotice,
    retry,
    startListening,
    stopListening,
    sendText,
    sendAudio,
    cancelListening,
    toggleHint,
    finish,
  };
}
