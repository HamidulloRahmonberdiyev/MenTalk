import { stripEmoji } from '../text';
import { geminiConfig } from './config';

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

/** OpenAPI-subset schema accepted by `generationConfig.responseSchema`. */
export type Schema = Record<string, unknown>;

interface GenerateResponse {
  candidates?: { content?: { parts?: { text?: string; inlineData?: { data: string; mimeType?: string } }[] } }[];
  promptFeedback?: { blockReason?: string };
}

const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1200;
const RETRY_STATUSES = new Set([429, 500, 503]);

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function post(model: string, body: unknown, signal?: AbortSignal): Promise<GenerateResponse> {
  const url = `${geminiConfig.baseUrl}/models/${model}:generateContent`;

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiConfig.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) return (await response.json()) as GenerateResponse;
      if (attempt === 0 && RETRY_STATUSES.has(response.status)) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      const detail = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new GeminiError(detail?.error?.message ?? `Gemini request failed (${response.status})`, response.status);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
}

function textOf(response: GenerateResponse): string {
  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  if (!text.trim()) {
    throw new GeminiError(response.promptFeedback?.blockReason ?? 'Gemini returned an empty answer');
  }
  return text;
}

/** Models sometimes wrap JSON in a markdown fence even when asked not to. */
function parseJson<T>(text: string): T {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new GeminiError('Gemini returned malformed JSON');
  }
}

interface GenerateOptions {
  system: string;
  contents: Content[];
  temperature?: number;
  /** Defaults to the conversation model. */
  model?: string;
  signal?: AbortSignal;
}

/** Runs against the main model and, if it is overloaded or rate-limited, once against the fallback model. */
async function withFallback<T>(model: string, run: (model: string) => Promise<T>): Promise<T> {
  try {
    return await run(model);
  } catch (error) {
    const overloaded = error instanceof GeminiError && (error.status === 503 || error.status === 429);
    if (!overloaded || model === geminiConfig.fallbackModel) throw error;
    return run(geminiConfig.fallbackModel);
  }
}

export async function generateJson<T>({
  system,
  contents,
  schema,
  temperature = 0.8,
  model = geminiConfig.model,
  signal,
}: GenerateOptions & { schema: Schema }): Promise<T> {
  const response = await withFallback(model, (name) =>
    post(
      name,
      {
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature },
      },
      signal,
    ),
  );
  return parseJson<T>(textOf(response));
}

export async function generateText({ system, contents, temperature = 0.8, model = geminiConfig.model, signal }: GenerateOptions): Promise<string> {
  const response = await withFallback(model, (name) =>
    post(name, { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature } }, signal),
  );
  return textOf(response).trim();
}

export interface SpeechData {
  /** Base64 of the audio: a complete WAV file, or raw 16-bit mono PCM. */
  base64: string;
  mimeType: string;
  /** Only meaningful for raw PCM. */
  sampleRate: number;
}

/**
 * The TTS model detects the language from the text, and the instruction in front of it biases the
 * accent: an English instruction before Russian text gives an English-sounding voice. So the style
 * instruction is written in the language being spoken.
 */
const TTS_STYLE: Record<string, (text: string) => string> = {
  ru: (text) => `Произнеси по-русски, чисто, без акцента, тёплым, естественным, дружелюбным голосом, как добрая учительница: ${text}`,
  en: (text) => `Say in a warm, natural, friendly tone, like a kind teacher: ${text}`,
};

/** Turns a line into natural speech with Gemini TTS. `language` is the ISO 639-1 code of `text`. */
export async function synthesizeSpeech(text: string, language = 'en'): Promise<SpeechData> {
  const style = TTS_STYLE[language] ?? TTS_STYLE.en;
  const response = await post(geminiConfig.ttsModel, {
    contents: [{ parts: [{ text: style(stripEmoji(text)) }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: geminiConfig.voice } } },
    },
  });

  const inline = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
  if (!inline?.data) throw new GeminiError('Gemini returned no audio');
  const rate = /rate=(\d+)/.exec(inline.mimeType ?? '')?.[1];
  return { base64: inline.data, mimeType: inline.mimeType ?? 'audio/wav', sampleRate: rate ? Number(rate) : 24_000 };
}
