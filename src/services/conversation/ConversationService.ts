import type { AiMessage, ConversationResult, Scenario, VoiceState } from '@/types';

export type ConversationEvent =
  | { type: 'state'; state: VoiceState }
  | { type: 'aiMessage'; message: AiMessage }
  | { type: 'error'; message: string };

export type ConversationListener = (event: ConversationEvent) => void;
export type Unsubscribe = () => void;

/**
 * A single live voice conversation. Implementations own the transport
 * (mock timers, Gemini Live, …); the UI only talks to this interface.
 */
export interface ConversationSession {
  subscribe(listener: ConversationListener): Unsubscribe;
  /** Opens the connection. The tutor greets the user once it resolves. */
  connect(): Promise<void>;
  startListening(): void;
  /** The user finished speaking; the tutor should reply. */
  stopListening(): void;
  /** Keyboard input as an alternative to voice. */
  sendText(text: string): void;
  requestHint(): Promise<string>;
  /** Ends the conversation and returns the evaluation. */
  end(): Promise<ConversationResult>;
  /** Releases all resources. Safe to call multiple times. */
  dispose(): void;
}

export interface ConversationService {
  createSession(scenario: Scenario): ConversationSession;
}
