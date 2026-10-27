import { readBase64 } from '@/services/gemini/audioFiles';
import { generateJson, type Part, type Schema } from '@/services/gemini/client';
import { geminiConfig } from '@/services/gemini/config';
import { TranslatorError, machineTranslate } from '@/services/translator/azure';
import type { LanguageCode, Register, TranslationResult, UzbekScript } from '@/types';

import { TRANSLATE_LANGUAGES, languageOf } from './languages';
import { hasCyrillic, looksLikeUzbekCyrillic, uzCyrillicToLatin, uzLatinToCyrillic } from './uzbekScript';

export type SourceLanguage = LanguageCode | 'auto';

export interface TranslateRequest {
  /** Typed text. Ignored when `audioUri` is given. */
  text: string;
  audioUri?: string;
  source: SourceLanguage;
  target: LanguageCode;
  uzScript: UzbekScript;
  /** Language of the app UI; usage notes are written in it. */
  uiLanguage: 'uz' | 'ru' | 'en';
  signal?: AbortSignal;
}

const LANGUAGE_CODES = TRANSLATE_LANGUAGES.map((item) => item.code);
const REGISTERS: Register[] = ['neutral', 'formal', 'informal', 'slang'];
const UI_NAMES = { uz: 'Uzbek', ru: 'Russian', en: 'English' } as const;

const SCHEMA: Schema = {
  type: 'OBJECT',
  properties: {
    sourceLanguage: { type: 'STRING', enum: LANGUAGE_CODES, description: 'Language of the input' },
    targetLanguage: { type: 'STRING', enum: LANGUAGE_CODES, description: 'Language the translation is in' },
    transcript: { type: 'STRING', description: 'For audio input: exactly what was said. For text input: the input unchanged' },
    translation: { type: 'STRING' },
    reading: { type: 'STRING', description: 'Latin-letter reading of the translation if its script is not Latin; otherwise empty' },
    stressed: { type: 'STRING', description: 'Russian translation with a combining acute accent on stressed vowels; empty if the translation is not Russian' },
    correctedInput: { type: 'STRING', description: 'Input with obvious typos fixed; empty if nothing needed fixing' },
    meanings: {
      type: 'ARRAY',
      description: 'Only for a single word or very short phrase with several distinct senses: up to 4, most common first. Otherwise empty',
      items: {
        type: 'OBJECT',
        properties: {
          translation: { type: 'STRING' },
          partOfSpeech: { type: 'STRING', description: 'Short, in the UI language, e.g. noun' },
          exampleSource: { type: 'STRING', description: 'A short example sentence in the source language' },
          exampleTarget: { type: 'STRING', description: 'The same example in the target language' },
        },
        required: ['translation', 'partOfSpeech'],
      },
    },
    alternatives: {
      type: 'ARRAY',
      description: 'Up to 3 genuinely different natural ways to say it in the target language; empty if there is only one sensible way',
      items: {
        type: 'OBJECT',
        properties: { text: { type: 'STRING' }, register: { type: 'STRING', enum: REGISTERS } },
        required: ['text', 'register'],
      },
    },
    note: { type: 'STRING', description: 'One short usage tip in the UI language (ambiguity, gender, formality); empty when not needed' },
  },
  required: ['sourceLanguage', 'targetLanguage', 'transcript', 'translation', 'reading', 'stressed', 'correctedInput', 'meanings', 'alternatives', 'note'],
};

interface RawResult {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  transcript: string;
  translation: string;
  reading?: string;
  stressed?: string;
  correctedInput?: string;
  meanings?: { translation: string; partOfSpeech: string; exampleSource?: string; exampleTarget?: string }[];
  alternatives?: { text: string; register: Register }[];
  note?: string;
}

function buildSystemPrompt({ source, target, uzScript, uiLanguage }: TranslateRequest): string {
  const targetName = languageOf(target).english;
  const fallbackCode = (['uz', 'ru', 'en'] as const).find((code) => code !== target) ?? 'en';
  const sourceRule =
    source === 'auto'
      ? `The input language is unknown: detect it (it may be Uzbek in Latin or Cyrillic script, Russian, English, or mixed).`
      : `The input is ${languageOf(source).english}.`;

  return [
    'You are a professional translator and bilingual lexicographer. Accuracy and natural phrasing matter more than literal word-for-word output.',
    sourceRule,
    `Translate into ${targetName}. If the input is already in ${targetName}, translate it into ${languageOf(fallbackCode).english} instead and set targetLanguage accordingly.`,
    'Translate the meaning in context: keep tone, register, punctuation, names, numbers and line breaks. Never explain or comment inside "translation"; it contains only the translation.',
    'Read obvious typos as intended. Fill correctedInput ONLY when the input has clear misspellings; never rephrase, restyle or "improve" text that is already correct. Otherwise leave it empty.',
    `Uzbek output must be written in ${uzScript === 'latin' ? 'Latin script (the modern official alphabet)' : 'Cyrillic script'}.`,
    'For a single word or short phrase with several real senses, fill "meanings" (most common first). Do not invent senses.',
    'Give "alternatives" only for sentences and phrases where natural options really differ (formal vs informal, and so on). For a single word use "meanings" instead and leave "alternatives" empty.',
    `Write partOfSpeech labels and "note" in ${UI_NAMES[uiLanguage]}. Keep the note to one short sentence and omit it unless it genuinely helps.`,
  ].join('\n');
}

const emptyIfMissing = (value?: string) => value?.trim() ?? '';

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}

/** A spelling fix changes a few letters; anything bigger is the model rewriting the user's text. */
function plausibleCorrection(original: string, corrected: string): boolean {
  if (!corrected || corrected === original) return false;
  return editDistance(original.toLowerCase(), corrected.toLowerCase()) / Math.max(original.length, 1) <= 0.25;
}

/** Translates typed or spoken input with Gemini. */
export async function translate(request: TranslateRequest): Promise<TranslationResult> {
  const parts: Part[] = request.audioUri
    ? [
        { text: 'Transcribe this speech exactly, then translate it.' },
        { inlineData: { mimeType: 'audio/mp4', data: await readBase64(request.audioUri) } },
      ]
    : [{ text: request.text }];

  const raw = await generateJson<RawResult>({
    system: buildSystemPrompt(request),
    contents: [{ role: 'user', parts }],
    schema: SCHEMA,
    temperature: 0.2,
    model: geminiConfig.translateModel,
    signal: request.signal,
  });

  return {
    sourceLanguage: raw.sourceLanguage,
    targetLanguage: raw.targetLanguage,
    sourceText: request.audioUri ? emptyIfMissing(raw.transcript) : request.text,
    translation: raw.translation.trim(),
    reading: emptyIfMissing(raw.reading),
    stressed: raw.targetLanguage === 'ru' ? emptyIfMissing(raw.stressed) : '',
    correctedInput: plausibleCorrection(request.text, emptyIfMissing(raw.correctedInput)) && !request.audioUri ? emptyIfMissing(raw.correctedInput) : '',
    meanings: (raw.meanings ?? []).slice(0, 4).map((item) => ({
      translation: item.translation,
      partOfSpeech: item.partOfSpeech,
      example:
        item.exampleSource && item.exampleTarget ? { source: item.exampleSource, target: item.exampleTarget } : undefined,
    })),
    alternatives: (raw.meanings?.length ? [] : (raw.alternatives ?? [])).slice(0, 3),
    note: emptyIfMissing(raw.note),
  };
}

const isLanguageCode = (code: string): code is LanguageCode => (LANGUAGE_CODES as string[]).includes(code);

/** The language translated into when the input is already in the target one (same rule as the prompt). */
const fallbackTarget = (target: LanguageCode): LanguageCode => (['uz', 'ru', 'en'] as const).find((code) => code !== target) ?? 'en';

/**
 * Instant translation with machine translation: only the translation itself, no meanings or notes
 * (`enrich` adds those). Throws a `TranslatorError` when the input is in a language the app does
 * not offer, so the caller can use Gemini instead.
 */
export async function translateFast({ text, source, target, uzScript, signal }: TranslateRequest): Promise<TranslationResult> {
  // The machine translator reads Uzbek only in Latin script.
  const uzCyrillic = hasCyrillic(text) && (source === 'uz' || (source === 'auto' && looksLikeUzbekCyrillic(text)));
  const input = uzCyrillic ? uzCyrillicToLatin(text) : text;
  const from = uzCyrillic ? 'uz' : source === 'auto' ? undefined : source;

  let to = target;
  let result = await machineTranslate(input, to, from, signal);
  const detected = result.from;
  if (!isLanguageCode(detected)) throw new TranslatorError(`Unsupported input language: ${detected}`);
  if (detected === target) {
    to = fallbackTarget(target);
    result = await machineTranslate(input, to, detected, signal);
  }

  return {
    sourceLanguage: detected,
    targetLanguage: to,
    sourceText: text,
    translation: to === 'uz' && uzScript === 'cyrillic' ? uzLatinToCyrillic(result.text) : result.text,
    reading: '',
    stressed: '',
    correctedInput: '',
    meanings: [],
    alternatives: [],
    note: '',
  };
}

/**
 * Adds Gemini's meanings, alternatives, notes and reading to an instant translation. The instant
 * wording stays so the text on screen does not jump; Gemini's wording becomes an alternative when
 * it differs. A typo in the input is the exception: then the instant one translated the typo.
 */
export async function enrich(request: TranslateRequest, base: TranslationResult): Promise<TranslationResult> {
  const detailed = await translate(request);
  if (detailed.correctedInput || detailed.targetLanguage !== base.targetLanguage) return detailed;

  const differs = detailed.translation.trim().toLowerCase() !== base.translation.trim().toLowerCase();
  const alternatives =
    differs && !detailed.meanings.length && !detailed.alternatives.some((item) => item.text === detailed.translation)
      ? [{ text: detailed.translation, register: 'neutral' as Register }, ...detailed.alternatives].slice(0, 3)
      : detailed.alternatives;

  return {
    ...detailed,
    sourceLanguage: base.sourceLanguage,
    translation: base.translation,
    // Reading and stress marks describe Gemini's wording; they only fit when it matches.
    reading: differs ? '' : detailed.reading,
    stressed: differs ? '' : detailed.stressed,
    alternatives,
  };
}
