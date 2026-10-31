import { isApiConfigured } from '@/services/api/config';
import { isGeminiConfigured } from '@/services/gemini/config';

import { ApiPronunciationService } from './ApiPronunciationService';
import { GeminiPronunciationService } from './GeminiPronunciationService';
import { MockPronunciationService } from './MockPronunciationService';
import type { PronunciationService } from './types';

export * from './types';

/** Same choice as the conversation backend: the MenTalk server, else Gemini directly, else the mock. */
function create(): PronunciationService {
  if (isApiConfigured) return new ApiPronunciationService();
  return isGeminiConfigured ? new GeminiPronunciationService() : new MockPronunciationService();
}

export const pronunciationService: PronunciationService = create();
