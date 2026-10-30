import { isApiConfigured } from '@/services/api/config';
import { endpoints } from '@/services/api/endpoints';
import { generateJson, type Schema } from '@/services/gemini/client';
import { geminiConfig } from '@/services/gemini/config';
import { glossRule } from '@/services/gemini/prompts';
import { studyLanguagePack, type StudyLanguage } from '@/services/learning';
import type { WordSuggestion } from '@/types';

import { normalizeWord } from './words';

export interface LookupRequest {
  /** The word exactly as tapped. */
  word: string;
  /** The sentence it was tapped in; gives the meaning its context. */
  sentence: string;
  uiLanguage: 'uz' | 'ru' | 'en';
  /** The language the word belongs to. */
  studyLanguage: StudyLanguage;
  signal?: AbortSignal;
}

const SCHEMA: Schema = {
  type: 'OBJECT',
  properties: {
    baseForm: { type: 'STRING', description: 'Dictionary form of the word, lowercase' },
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
export async function lookupWord(request: LookupRequest): Promise<WordSuggestion> {
  const { word, sentence, uiLanguage, studyLanguage } = request;
  const form = normalizeWord(word);
  const key = `${form}|${sentence}|${uiLanguage}|${studyLanguage}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const raw = isApiConfigured ? await lookupOnServer(request) : await lookupWithGemini(request);

  const base = normalizeWord(raw.baseForm || form);
  const result: WordSuggestion = {
    word: base,
    translation: raw.translation.trim(),
    language: studyLanguage,
    example: sentence,
    form: form !== base ? form : undefined,
  };
  cache.set(key, result);
  return result;
}

async function lookupOnServer({ word, sentence, uiLanguage, studyLanguage, signal }: LookupRequest): Promise<RawLookup> {
  const { form, translation } = await endpoints.lookup(word, sentence, uiLanguage, studyLanguage, signal);
  return { baseForm: form, translation };
}

function lookupWithGemini({ word, sentence, uiLanguage, studyLanguage, signal }: LookupRequest): Promise<RawLookup> {
  const pack = studyLanguagePack(studyLanguage);
  return generateJson<RawLookup>({
    system: [
      `You are a ${pack.name} lexicographer helping a learner who just met a word in a sentence.`,
      `Return the word's dictionary form (${pack.dictionaryForm}) and its meaning in this sentence, glossed in ${glossRule(uiLanguage, pack)}. No explanations, no punctuation.`,
    ].join('\n'),
    contents: [{ role: 'user', parts: [{ text: `Word: ${word}\nSentence: ${sentence}` }] }],
    schema: SCHEMA,
    temperature: 0.1,
    model: geminiConfig.translateModel,
    signal,
  });
}
