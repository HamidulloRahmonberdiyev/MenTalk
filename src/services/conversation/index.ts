import type { ConversationService } from './ConversationService';
import { MockConversationService } from './MockConversationService';

export type {
  ConversationEvent,
  ConversationService,
  ConversationSession,
} from './ConversationService';

/**
 * Single composition point for the conversation backend.
 * Swap in a realtime provider (e.g. Gemini Live) here; the UI is unaffected.
 */
export const conversationService: ConversationService = new MockConversationService();
