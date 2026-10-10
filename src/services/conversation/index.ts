import { isApiConfigured } from '@/services/api/config';
import { isGeminiConfigured } from '@/services/gemini/config';

import { ApiConversationService } from './ApiConversationService';
import type { ConversationService } from './ConversationService';
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
 * Single composition point for the conversation backend: the MenTalk server when an API URL is
 * set, otherwise Gemini directly when a key is configured, otherwise the scripted mock.
 */
function create(): ConversationService {
  if (isApiConfigured) return new ApiConversationService();
  return isGeminiConfigured ? new GeminiConversationService() : new MockConversationService();
}

export const conversationService: ConversationService = create();
