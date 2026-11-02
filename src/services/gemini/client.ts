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

const post = (model: string, body: unknown, signal?: AbortSignal) => request<GenerateResponse>(`/models/${model}:generateContent`, body, signal);

async function request<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const url = `${geminiConfig.baseUrl}${path}`;

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

      if (response.ok) return (await response.json()) as T;
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

interface InteractionResponse {
  steps?: { type?: string; content?: { data?: string; mime_type?: string }[] }[];
}

/**
 * Turns a line into natural speech with Gemini TTS. It detects the language from the text itself,
 * and the voice (see `geminiConfig.voice`) sets the character.
 *
 * `style` ("angry and stern") goes through the Interactions API as a `speech_metadata` note: in
 * generateContent the model reads everything in the prompt aloud, and it refuses a system
 * instruction. Should that call fail (e.g. a proxy without the route), the line is still voiced,
 * just without the style.
 */
export async function synthesizeSpeech(text: string, style?: string): Promise<SpeechData> {
  if (style) {
    try {
      return await synthesizeStyled(stripEmoji(text), style);
    } catch (error) {
      // Out of quota: the plain call would be refused too.
      if (error instanceof GeminiError && error.status === 429) throw error;
      if (__DEV__) console.warn('Styled Gemini speech failed, voicing without the style:', error);
    }
  }

  const response = await post(geminiConfig.ttsModel, {
    contents: [{ parts: [{ text: stripEmoji(text) }] }],
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

async function synthesizeStyled(text: string, style: string): Promise<SpeechData> {
  const response = await request<InteractionResponse>('/interactions', {
    model: geminiConfig.ttsModel,
    input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: geminiConfig.voice }] },
  });

  const audio = response.steps
    ?.filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .find((item) => item.data);
  if (!audio?.data) throw new GeminiError('Gemini returned no audio');
  const mimeType = audio.mime_type ?? 'audio/wav';
  const rate = /rate=(\d+)/.exec(mimeType)?.[1];
  return { base64: audio.data, mimeType, sampleRate: rate ? Number(rate) : 24_000 };
}
