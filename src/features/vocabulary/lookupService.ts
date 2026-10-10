import { isApiConfigured } from '@/services/api/config';
import { endpoints } from '@/services/api/endpoints';
import { generateJson, type Schema } from '@/services/gemini/client';
import { geminiConfig } from '@/services/gemini/config';
import { glossRule } from '@/services/gemini/prompts';
import type { WordSuggestion } from '@/types';

import { normalizeWord } from './words';

export interface LookupRequest {
  /** The word exactly as tapped. */
  word: string;
  /** The Russian sentence it was tapped in; gives the meaning its context. */
  sentence: string;
  uiLanguage: 'uz' | 'ru' | 'en';
  signal?: AbortSignal;
}

const SCHEMA: Schema = {
  type: 'OBJECT',
  properties: {
    baseForm: { type: 'STRING', description: 'Dictionary form of the word, lowercase (infinitive, nominative singular)' },
    translation: { type: 'STRING', description: 'Meaning of the word as used in the sentence, in the requested language' },
  },
  required: ['baseForm', 'translation'],
};

interface RawLookup {
  baseForm: string;
  translation: string;
}

const cache = new Map<string, WordSuggestion>();

/** Looks a tapped word up: its dictionary form and its meaning in context. Results are cached per session. */
export async function lookupWord({ word, sentence, uiLanguage, signal }: LookupRequest): Promise<WordSuggestion> {
  const form = normalizeWord(word);
  const key = `${form}|${sentence}|${uiLanguage}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const raw = isApiConfigured ? await lookupOnServer(word, sentence, uiLanguage, signal) : await lookupWithGemini(word, sentence, uiLanguage, signal);

  const base = normalizeWord(raw.baseForm || form);
  const result: WordSuggestion = {
    word: base,
    translation: raw.translation.trim(),
    example: sentence,
    form: form !== base ? form : undefined,
  };
  cache.set(key, result);
  return result;
}

async function lookupOnServer(word: string, sentence: string, uiLanguage: LookupRequest['uiLanguage'], signal?: AbortSignal): Promise<RawLookup> {
  const { form, translation } = await endpoints.lookup(word, sentence, uiLanguage, signal);
  return { baseForm: form, translation };
}

function lookupWithGemini(word: string, sentence: string, uiLanguage: LookupRequest['uiLanguage'], signal?: AbortSignal): Promise<RawLookup> {
  return generateJson<RawLookup>({
    system: [
      'You are a Russian lexicographer helping a learner who just met a word in a sentence.',
      `Return the word's dictionary form and its meaning in this sentence, glossed in ${glossRule(uiLanguage)}. No explanations, no punctuation.`,
    ].join('\n'),
    contents: [{ role: 'user', parts: [{ text: `Word: ${word}\nSentence: ${sentence}` }] }],
    schema: SCHEMA,
    temperature: 0.1,
    model: geminiConfig.translateModel,
    signal,
  });
}
