import { AI_TIMEOUT_MS, api } from './http';

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  gender: 'male' | 'female' | null;
  country: string | null;
  birth_date: string | null;
  level: 'beginner' | 'elementary' | 'intermediate' | 'advanced' | null;
  goals: string[];
  ui_language: 'uz' | 'ru' | 'en' | null;
  timezone: string | null;
  daily_goal_minutes: number;
  xp: number;
  streak: number;
}

export type ApiProfilePatch = Partial<
  Pick<ApiUser, 'name' | 'gender' | 'country' | 'birth_date' | 'level' | 'goals' | 'ui_language' | 'timezone' | 'daily_goal_minutes'>
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
  state: 'active' | 'finished';
  score: number | null;
  learner_turns: number;
  duration_sec: number | null;
  started_at: string;
  ended_at: string | null;
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

export interface ApiCard {
  word: string;
  translation: string;
  example: string | null;
  form: string | null;
  stage: number;
  streak: number;
  lapses: number;
  due_at: string;
  updated_at: string;
  deleted: boolean;
}

export type TurnPayload = { text: string } | { audio: string; mime: string };

export const endpoints = {
  signInWithGoogle: (idToken: string, device: string) =>
    api<{ token: string; user: ApiUser }>('POST', '/auth/google', { body: { id_token: idToken, device } }),
  signOut: () => api<void>('DELETE', '/auth/session'),

  me: () => api<ApiUser>('GET', '/me'),
  updateMe: (patch: ApiProfilePatch) => api<ApiUser>('PUT', '/me', { body: patch }),
  stats: () => api<ApiStats>('GET', '/stats'),
  history: () => api<ApiHistoryItem[]>('GET', '/history'),

  startConversation: (scenarioId: string, signal?: AbortSignal) =>
    api<ApiOpening>('POST', '/conversations', { body: { scenario_id: scenarioId }, timeoutMs: AI_TIMEOUT_MS, signal }),
  sendTurn: (conversationId: number, payload: TurnPayload, signal?: AbortSignal) =>
    api<ApiTurn>('POST', `/conversations/${conversationId}/turns`, { body: payload, timeoutMs: AI_TIMEOUT_MS, signal }),
  hint: (conversationId: number) =>
    api<{ hint: string }>('POST', `/conversations/${conversationId}/hint`, { timeoutMs: AI_TIMEOUT_MS }),
  finish: (conversationId: number) =>
    api<ApiResult>('POST', `/conversations/${conversationId}/finish`, { timeoutMs: AI_TIMEOUT_MS }),

  lookup: (word: string, sentence: string, language: string, signal?: AbortSignal) =>
    api<{ form: string; translation: string }>('POST', '/vocabulary/lookup', {
      body: { word, sentence, language },
      timeoutMs: AI_TIMEOUT_MS,
      signal,
    }),
  syncCards: (cursor: string | null, changes: ApiCard[]) =>
    api<{ cards: ApiCard[]; cursor: string }>('POST', '/vocabulary/sync', { body: { cursor, changes } }),
  reviewCards: (answers: { word: string; correct: boolean; answered_at: string }[]) =>
    api<{ xp: number }>('POST', '/vocabulary/reviews', { body: { answers } }),
};
