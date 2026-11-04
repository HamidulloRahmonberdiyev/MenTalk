import type { StudyLanguage } from '@/services/learning';
import type { LearnerExperience, LevelSource, ReferralSource, ReviewRating, TutorCharacter, TutorTone, WordSource, WordStatus } from '@/types';

import { AI_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, api, apiPage } from './http';
import { streamEvents } from './stream';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  avatar_custom: boolean;
  gender: 'male' | 'female' | null;
  country: string | null;
  birth_date: string | null;
  level: 'beginner' | 'elementary' | 'intermediate' | 'advanced' | null;
  /** Missing on servers that predate the placement test. */
  level_source?: LevelSource | null;
  placement_score?: number | null;
  experience?: LearnerExperience | null;
  referral_source?: ReferralSource | null;
  goals: string[];
  focus?: string[];
  ui_language: 'uz' | 'ru' | 'en' | null;
  /** The language being learned; null on servers that predate English. */
  target_language: StudyLanguage | null;
  timezone: string | null;
  daily_goal_minutes: number;
  xp: number;
  streak: number;
  /** Tutor preferences; missing on servers that predate them. */
  tutor_character?: TutorCharacter | null;
  tutor_tone?: TutorTone | null;
}

export type ApiProfilePatch = Partial<
  Pick<
    ApiUser,
    | 'name'
    | 'gender'
    | 'country'
    | 'birth_date'
    | 'level'
    | 'level_source'
    | 'placement_score'
    | 'experience'
    | 'referral_source'
    | 'goals'
    | 'focus'
    | 'ui_language'
    | 'target_language'
    | 'timezone'
    | 'daily_goal_minutes'
    | 'tutor_character'
    | 'tutor_tone'
  >
>;

export interface ApiStats {
  daily_goal_minutes: number;
  today_minutes: number;
  today_xp: number;
  streak: number;
  xp: number;
}

export interface ApiHistoryItem {
  id: number;
  scenario_id: string;
  target_language?: StudyLanguage;
  state: 'active' | 'finished';
  score: number | null;
  learner_turns: number;
  duration_sec: number | null;
  started_at: string;
  ended_at: string | null;
}

export interface ApiPathStage {
  stage: number;
  scenario_id: string;
  status: 'passed' | 'open' | 'locked';
  best_score: number | null;
  attempts: number;
  stars: number;
  last_played_at: string | null;
}

export interface ApiPath {
  language: string;
  pass_score: number;
  passed: number;
  stages: ApiPathStage[];
}

export interface ApiTurn {
  id: number;
  transcript: string | null;
  reply: string;
  emotion: string;
  audio_url: string | null;
  audio_ms: number | null;
}

export interface ApiOpening extends ApiTurn {
  conversation_id: number;
}

export interface ApiMistake {
  said: string;
  correct: string;
  note?: string;
}

export interface ApiNewWord {
  word: string;
  translation: string;
  form?: string;
  example?: string;
}

export interface ApiResult {
  conversation_id: number;
  speech: number;
  vocabulary: number;
  grammar: number;
  overall: number;
  mistakes: ApiMistake[];
  new_words: ApiNewWord[];
}

/** A word on the learner's list as the server keeps it: a dictionary word plus this learner's schedule. */
export interface ApiUserWord {
  id: string;
  /** The dictionary spelling, which may differ from how this device wrote it. */
  word: string;
  language: StudyLanguage;
  pos: string | null;
  transcription: string | null;
  translation: string | null;
  translation_language: string | null;
  form: string | null;
  context_sentence: string | null;
  source: WordSource;
  status: WordStatus;
  ease: number;
  interval_days: number;
  repetitions: number;
  lapses: number;
  due_at: string;
  last_reviewed_at: string | null;
  updated_at: string;
  deleted: boolean;
}

/** A word as this device last saw it, for `POST /vocabulary/sync`. `id` is null until the server has assigned one. */
export type ApiUserWordChange = Omit<ApiUserWord, 'id' | 'pos' | 'transcription'> & { id: string | null };

export interface ApiReviewAnswer {
  id: string | null;
  word: string;
  language: StudyLanguage;
  rating: ReviewRating;
  answered_at: string;
  duration_ms: number | null;
}

/** `POST /pronunciation/assess`. `error_type` follows Azure: None, Mispronunciation, Omission, Insertion. */
export interface ApiPronunciation {
  score: number;
  words: { word: string; score: number; error_type: string }[];
  tips: { word: string; sound: string | null; problem: string; how_to: string }[];
  /** Words scored below 80, in dictionary form with a meaning in `ui_language`. Missing on older servers. */
  new_words?: { word: string; form: string | null; translation: string }[];
}

/** A notification already put into words by the server, in the language asked for. */
export interface ApiNotification {
  id: string;
  type: string;
  kind: string;
  title: string;
  body: string;
  /** `target` names a screen, not a path; unknown ones are ignored. */
  action: { target: string; label: string } | null;
  read: boolean;
  created_at: string;
}

/** Either the listed notifications or all of them (up to `before`, when given). */
export type ApiNotificationSelection = { ids: string[] } | { all: true; before?: string };

export type TurnPayload = ({ text: string } | { audio: string; mime: string }) & { tone?: TutorTone };

/**
 * Events of `POST /conversations/{id}/turns/stream`, in the order they arrive:
 * `transcript` (voice turns), `delta`… (the reply as it is written), `reply` (final text),
 * `audio` (once the voice is recorded; absent if that failed), `done`. `error` may replace any of them.
 */
export type TurnStreamEvent =
  | { event: 'transcript'; data: { text: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'reply'; data: { id?: number | null; reply: string; emotion: string } }
  | { event: 'audio'; data: { url: string; ms: number | null } }
  | { event: 'error'; data: { type?: string; status?: number } }
  | { event: 'done'; data: unknown };

export const endpoints = {
  /** `uiLanguage` becomes the language of a newly created profile; an existing one keeps its own. */
  signInWithGoogle: (idToken: string, device: string, uiLanguage: 'uz' | 'ru' | 'en') =>
    api<{ token: string; user: ApiUser }>('POST', '/auth/google', { body: { id_token: idToken, device, ui_language: uiLanguage } }),
  signOut: () => api<void>('DELETE', '/auth/session'),

  me: () => api<ApiUser>('GET', '/me'),
  updateMe: (patch: ApiProfilePatch) => api<ApiUser>('PUT', '/me', { body: patch }),
  uploadAvatar: (photo: FormData) => api<ApiUser>('POST', '/me/avatar', { body: photo, timeoutMs: UPLOAD_TIMEOUT_MS, idempotent: true }),
  deleteAvatar: () => api<ApiUser>('DELETE', '/me/avatar'),
  stats: () => api<ApiStats>('GET', '/stats'),
  history: () => api<ApiHistoryItem[]>('GET', '/history'),
  path: (language: StudyLanguage) => api<ApiPath>('GET', `/path?language=${language}`),

  startConversation: (scenarioId: string, targetLanguage: StudyLanguage, tone: TutorTone, signal?: AbortSignal) =>
    api<ApiOpening>('POST', '/conversations', {
      body: { scenario_id: scenarioId, target_language: targetLanguage, tone },
      timeoutMs: AI_TIMEOUT_MS,
      signal,
    }),
  sendTurn: (conversationId: number, payload: TurnPayload, signal?: AbortSignal) =>
    api<ApiTurn>('POST', `/conversations/${conversationId}/turns`, { body: payload, timeoutMs: AI_TIMEOUT_MS, signal }),
  /** Same turn as `sendTurn`, answered as a stream. Throws `StreamUnsupportedError` on servers without it. */
  streamTurn: (conversationId: number, payload: TurnPayload, onEvent: (event: TurnStreamEvent) => void, signal?: AbortSignal) =>
    streamEvents(`/conversations/${conversationId}/turns/stream`, {
      body: payload,
      // Between events, not for the whole reply: a long answer keeps the stream alive by itself.
      idleTimeoutMs: AI_TIMEOUT_MS,
      signal,
      onEvent: (event, data) => onEvent({ event, data } as TurnStreamEvent),
    }),
  hint: (conversationId: number) =>
    api<{ hint: string }>('POST', `/conversations/${conversationId}/hint`, { timeoutMs: AI_TIMEOUT_MS, idempotent: true }),
  finish: (conversationId: number) =>
    api<ApiResult>('POST', `/conversations/${conversationId}/finish`, { timeoutMs: AI_TIMEOUT_MS, idempotent: true }),

  /** Multipart: `audio` (m4a), `reference`, `language`, `ui_language`. Stateless, so safe to retry. */
  assessPronunciation: (form: FormData, signal?: AbortSignal) =>
    api<ApiPronunciation>('POST', '/pronunciation/assess', { body: form, timeoutMs: AI_TIMEOUT_MS, idempotent: true, signal }),

  lookup: (word: string, sentence: string, language: string, targetLanguage: StudyLanguage, signal?: AbortSignal) =>
    api<{ form: string; translation: string }>('POST', '/vocabulary/lookup', {
      body: { word, sentence, language, target_language: targetLanguage },
      timeoutMs: AI_TIMEOUT_MS,
      idempotent: true,
      signal,
    }),
  syncWords: (cursor: string | null, changes: ApiUserWordChange[]) =>
    api<{ words: ApiUserWord[]; cursor: string }>('POST', '/vocabulary/sync', { body: { cursor, changes } }),
  /** The server ignores answers it has already logged, so a round is safe to resend. */
  reviewWords: (answers: ApiReviewAnswer[]) => api<{ xp: number }>('POST', '/vocabulary/reviews', { body: { answers }, idempotent: true }),

  notifications: (language: 'uz' | 'ru' | 'en', limit = 50) =>
    apiPage<ApiNotification, { unread_count: number }>(`/notifications?limit=${limit}&lang=${language}`),
  /** Both are idempotent on the server: ids already read, deleted or unknown are skipped. */
  readNotifications: (selection: ApiNotificationSelection) =>
    api<{ unread_count: number }>('POST', '/notifications/read', { body: selection, idempotent: true }),
  deleteNotifications: (selection: ApiNotificationSelection) =>
    api<{ unread_count: number }>('POST', '/notifications/delete', { body: selection, idempotent: true }),
  /** Registering the same device again changes nothing, so it is safe to resend. */
  registerPushToken: (token: string, platform: 'android' | 'ios') =>
    api<void>('POST', '/me/push-token', { body: { token, platform }, idempotent: true }),
};
