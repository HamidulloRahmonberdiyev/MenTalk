import { isApiConfigured } from '@/services/api/config';
import { isGeminiConfigured } from '@/services/gemini/config';

import { ApiPronunciationService } from './ApiPronunciationService';
import { GeminiPronunciationService } from './GeminiPronunciationService';
import { MockPronunciationService } from './MockPronunciationService';
import type { PronunciationService } from './types';

export * from './types';

/**
 * Gemini directly whenever it is configured, even in prod: the MenTalk server has no
 * `/pronunciation/assess` route yet (404). Then the server, else the mock.
 */
function create(): PronunciationService {
  if (isGeminiConfigured) return new GeminiPronunciationService();
  return isApiConfigured ? new ApiPronunciationService() : new MockPronunciationService();
}

export const pronunciationService: PronunciationService = create();
