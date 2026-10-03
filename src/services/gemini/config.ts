/**
 * Gemini settings, read from EXPO_PUBLIC_* variables (put them in `.env.local`, see `.env.example`).
 * Expo only inlines `process.env.EXPO_PUBLIC_X` when written out in full, so each one is spelled out.
 *
 * Anything EXPO_PUBLIC_ ships inside the app bundle. Use a real key only while developing; for
 * release, point EXPO_PUBLIC_GEMINI_BASE_URL at your own server that adds the key.
 */
export const geminiConfig = {
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  baseUrl: process.env.EXPO_PUBLIC_GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
  /** Fast model for conversation turns. */
  model: process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
  /** Tried once when the main model is overloaded (503) or rate-limited. */
  fallbackModel: process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODEL ?? 'gemini-3.8-flash',
  /** Fast, cheap model for the translator. */
  translateModel: process.env.EXPO_PUBLIC_GEMINI_TRANSLATE_MODEL ?? 'gemini-3.5-flash-lite',
  ttsModel: process.env.EXPO_PUBLIC_GEMINI_TTS_MODEL ?? 'gemini-3.8-flash-tts',
  voice: process.env.EXPO_PUBLIC_GEMINI_VOICE ?? 'Kore',
  /** Set EXPO_PUBLIC_GEMINI_TTS=off to always use the device voice. */
  ttsEnabled: process.env.EXPO_PUBLIC_GEMINI_TTS !== 'off',
} as const;

/** A key or a proxy URL is enough to switch the app from the scripted mock to Gemini. */
export const isGeminiConfigured =
  geminiConfig.apiKey.length > 0 || process.env.EXPO_PUBLIC_GEMINI_BASE_URL !== undefined;
