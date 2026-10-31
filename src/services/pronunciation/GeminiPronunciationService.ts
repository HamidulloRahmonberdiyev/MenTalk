import type { Language } from '@/i18n';
import { readBase64 } from '@/services/gemini/audioFiles';
import { generateJson, type Schema } from '@/services/gemini/client';
import { studyLanguagePack } from '@/services/learning';

import { deleteRecording } from './tempAudio';
import { alignWords, type AssessRequest, type PronunciationResult, type PronunciationService } from './types';

const UI_NAMES: Record<Language, string> = { uz: 'Uzbek (Latin script)', ru: 'Russian', en: 'English' };

const SCHEMA: Schema = {
  type: 'object',
  properties: {
    score: { type: 'integer' },
    words: {
      type: 'array',
      items: { type: 'object', properties: { word: { type: 'string' }, score: { type: 'integer' }, omitted: { type: 'boolean' } }, required: ['word', 'score'] },
    },
    tips: {
      type: 'array',
      items: {
        type: 'object',
        properties: { word: { type: 'string' }, sound: { type: 'string' }, problem: { type: 'string' }, howTo: { type: 'string' } },
        required: ['word', 'problem', 'howTo'],
      },
    },
    newWords: {
      type: 'array',
      items: {
        type: 'object',
        properties: { word: { type: 'string' }, form: { type: 'string' }, translation: { type: 'string' } },
        required: ['word', 'form', 'translation'],
      },
    },
  },
  required: ['score', 'words', 'tips', 'newWords'],
  propertyOrdering: ['score', 'words', 'tips', 'newWords'],
};

interface Answer {
  score: number;
  words: { word: string; score: number; omitted?: boolean }[];
  tips: { word: string; sound?: string; problem: string; howTo: string }[];
  newWords: { word: string; form: string; translation: string }[];
}

/**
 * Local-mode stand-in for the server (no MenTalk API configured): one Gemini call that listens and
 * scores. The server uses a dedicated speech scorer instead and calls a model only for the tips.
 */
export class GeminiPronunciationService implements PronunciationService {
  async assess({ audioUri, reference, language, uiLanguage, signal }: AssessRequest): Promise<PronunciationResult> {
    try {
      const audio = await readBase64(audioUri);
      const answer = await generateJson<Answer>({
        system: [
          `You are a strict ${studyLanguagePack(language).name} pronunciation examiner for a language learner.`,
          'Listen to the recording and compare it with the reference text. Score every reference word 0-100 for how accurately it was pronounced (100 = native-like, below 55 = clearly wrong). Mark words that were not said as omitted with score 0.',
          'score is the overall pronunciation score 0-100.',
          `tips: at most the 2 most important mistakes (none if every word scored 80+). For each: the word, the IPA sound that went wrong, problem = what the learner did, howTo = a concrete mouth/tongue instruction. Write problem and howTo in ${UI_NAMES[uiLanguage]}, one short sentence each.`,
          `newWords: one entry for every reference word scored below 80 (skip names and numbers): word = its dictionary form in lowercase, form = the word exactly as in the reference, translation = its meaning in this sentence, in ${UI_NAMES[uiLanguage]} (1-3 words).`,
        ].join('\n'),
        contents: [{ role: 'user', parts: [{ text: `Reference: ${reference}` }, { inlineData: { mimeType: 'audio/mp4', data: audio } }] }],
        schema: SCHEMA,
        temperature: 0.2,
        signal,
      });
      return {
        score: Math.round(Math.min(100, Math.max(0, answer.score))),
        words: alignWords(reference, answer.words),
        tips: answer.tips.slice(0, 2).map((tip) => ({ ...tip, sound: tip.sound || undefined })),
        newWords: (answer.newWords ?? []).map(({ word, form, translation }) => ({
          word: word.toLocaleLowerCase(),
          translation,
          language,
          example: reference,
          form: form && form.toLocaleLowerCase() !== word.toLocaleLowerCase() ? form : undefined,
        })),
      };
    } finally {
      deleteRecording(audioUri);
    }
  }
}
