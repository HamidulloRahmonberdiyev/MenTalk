import * as Speech from 'expo-speech';

/**
 * Picks the most pleasant installed text-to-speech voice for a language. Used only when Gemini
 * speech is unavailable, so the fallback does not sound like the default robot.
 *
 * `scoreVoice` and `pickBestVoice` are pure, so the heuristic can be tested without a device.
 */

const FEMALE_NAMES = /milena|katya|svetlana|dariya|alena|tatyana|irina|anna|olga|female/i;
const MALE_NAMES = /yuri|pavel|maxim|dmitri|ivan|male/i;

export function scoreVoice(voice: Speech.Voice): number {
  let score = 0;
  if (voice.quality === Speech.VoiceQuality.Enhanced) score += 10;
  // Android's server-side ("network") voices are the neural ones.
  if (/network/i.test(voice.identifier)) score += 4;
  if (FEMALE_NAMES.test(voice.name) || FEMALE_NAMES.test(voice.identifier)) score += 5;
  if (MALE_NAMES.test(voice.name) || MALE_NAMES.test(voice.identifier)) score -= 5;
  return score;
}

export function pickBestVoice(voices: readonly Speech.Voice[], languageTag: string): string | undefined {
  const prefix = languageTag.slice(0, 2).toLowerCase();
  let best: Speech.Voice | undefined;
  let bestScore = -Infinity;
  for (const voice of voices) {
    if (!voice.language.toLowerCase().startsWith(prefix)) continue;
    const score = scoreVoice(voice) + (voice.language.replace('_', '-').toLowerCase() === languageTag.toLowerCase() ? 1 : 0);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best?.identifier;
}

const cache = new Map<string, Promise<string | undefined>>();

/** Identifier of the best device voice for `languageTag` (e.g. 'ru-RU'), looked up once per language. */
export function getDeviceVoiceId(languageTag: string): Promise<string | undefined> {
  let cached = cache.get(languageTag);
  if (!cached) {
    cached = Speech.getAvailableVoicesAsync()
      .then((voices) => pickBestVoice(voices, languageTag))
      .catch(() => undefined);
    cache.set(languageTag, cached);
  }
  return cached;
}
