/**
 * Microsoft Translator (Azure AI Translator), used for the instant translation. It is plain machine
 * translation, so it answers in a fraction of a second where an LLM needs several.
 *
 * Use the free F0 tier: it never bills, it just answers 429 once the monthly allowance is used up,
 * so a key shipped in the app (EXPO_PUBLIC_) can be abused at worst into a temporary outage, never
 * into a bill. The translator then falls back to Gemini.
 */
export const azureTranslatorConfig = {
  key: process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_KEY ?? '',
  /** The resource's region, e.g. westeurope. Leave empty for a global resource. */
  region: process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_REGION ?? '',
  endpoint: 'https://api.cognitive.microsofttranslator.com',
} as const;

export const isAzureTranslatorConfigured = azureTranslatorConfig.key.length > 0;

export class TranslatorError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'TranslatorError';
  }
}

const TIMEOUT_MS = 8_000;

interface AzureTranslation {
  detectedLanguage?: { language: string; score: number };
  translations: { text: string; to: string }[];
}

export interface MachineTranslation {
  text: string;
  /** Language code of the input, as given or as detected. */
  from: string;
}

/** Translates `text` into `to`. Leave `from` undefined to have the language detected. */
export async function machineTranslate(text: string, to: string, from?: string, signal?: AbortSignal): Promise<MachineTranslation> {
  const params = new URLSearchParams({ 'api-version': '3.0', to, textType: 'plain' });
  if (from) params.set('from', from);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  try {
    const response = await fetch(`${azureTranslatorConfig.endpoint}/translate?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': azureTranslatorConfig.key,
        ...(azureTranslatorConfig.region ? { 'Ocp-Apim-Subscription-Region': azureTranslatorConfig.region } : {}),
      },
      body: JSON.stringify([{ Text: text }]),
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => null)) as AzureTranslation[] | { error?: { message?: string } } | null;
    if (!response.ok || !Array.isArray(payload)) {
      const message = payload && !Array.isArray(payload) ? payload.error?.message : undefined;
      throw new TranslatorError(message ?? `Translator request failed (${response.status})`, response.status);
    }
    const [item] = payload;
    const translated = item?.translations?.[0]?.text;
    if (!translated) throw new TranslatorError('Translator returned no translation');
    return { text: translated, from: from ?? item.detectedLanguage?.language ?? '' };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
