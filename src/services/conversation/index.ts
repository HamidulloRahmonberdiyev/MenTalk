import type { ConversationService } from './ConversationService';
import { isGeminiConfigured } from '@/services/gemini/config';

import { GeminiConversationService } from './GeminiConversationService';
import { MockConversationService } from './MockConversationService';

export type {
  ConversationEvent,
  ConversationService,
  ConversationSession,
  NoticeCode,
  RecordedAudio,
} from './ConversationService';

/**
 * Single composition point for the conversation backend.
 * Uses Gemini when a key (or proxy URL) is configured, otherwise the scripted mock.
 */
export const conversationService: ConversationService = isGeminiConfigured
  ? new GeminiConversationService()
  : new MockConversationService();
