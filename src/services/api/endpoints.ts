import type { StudyLanguage } from '@/services/learning';
import type { LearnerExperience, LevelSource, LocalizedText, NativeLanguage, ReferralSource, ReviewRating, TutorCharacter, TutorTone, WordSource, WordStatus } from '@/types';

import { AI_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, api, apiBody, apiPage } from './http';
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
  /** Missing on servers that predate the question. */
  native_language?: NativeLanguage | null;
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
    | 'native_language'
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

/** A conversation topic. `title` and `subtitle` carry every interface language. */
export interface ApiScenario {
  id: string;
  icon: string;
  tint: string;
  gradient: string[] | null;
  image_url: string | null;
  title: Partial<LocalizedText> | null;
  subtitle: Partial<LocalizedText> | null;
  languages?: string[];
}

export interface ApiCertificate {
  serial: string;
  language: string;
  level: string;
  cefr: string;
  holder_name: string;
  /** Null when no activity measured the skill (no conversation yet); never shown as a zero. */
  speaking: number | null;
  vocabulary: number | null;
  grammar: number | null;
  overall: number;
  issued_at: string;
  verify_url: string;
  /** What the level rests on. Missing on servers from before any-activity certificates. */
  placement_score?: number | null;
  conversations?: number;
  words?: number;
}

export interface ApiCertificateStatus {
  language: string;
  level: string | null;
  cefr: string | null;
  /** Whether the placement test was taken; a hand-picked level counts for nothing. */
  placed: boolean;
  conversations: number;
  /** Rated conversations the top level (B2+) needs. */
  required_conversations: number;
  /** Words on the learner's list in this language. */
  words?: number;
  /** Any activity at all (a saved word, a rated chat, the test); `level` is what it supports. */
  eligible: boolean;
  /** The latest one issued in this language, which may be for an earlier level. */
  certificate: ApiCertificate | null;
}

export interface ApiStats {
  daily_goal_minutes: number;
  today_minutes: number;
  today_xp: number;
  streak: number;
  xp: number;
}

/** One day of `GET /progress/calendar`; only days with some practice are listed. */
export interface ApiCalendarDay {
  /** `YYYY-MM-DD` in the learner's time zone. */
  date: string;
  minutes: number;
  xp: number;
  conversations: number;
  goal_met: boolean;
}

export interface ApiCalendar {
  /** `YYYY-MM`. */
  month: string;
  /** The server's today in the learner's time zone, `YYYY-MM-DD`. */
  today: string;
  /** First day the learner ever practised; null before that. */
  since: string | null;
  goal_minutes: number;
  streak: number;
  best_streak: number;
  days: ApiCalendarDay[];
  totals: { active_days: number; minutes: number; xp: number; conversations: number };
}

export type LeaderboardPeriod = 'week' | 'all';

/** One learner on `GET /leaderboard`. Other learners' surnames are cut to an initial by the server. */
export interface ApiLeaderboardEntry {
  rank: number;
  name: string;
  avatar_url: string | null;
  xp: number;
  is_me: boolean;
}

export interface ApiLeaderboard {
  period: LeaderboardPeriod;
  /** Monday the week started, `YYYY-MM-DD`; null for all time. */
  since: string | null;
  top: ApiLeaderboardEntry[];
  /**
   * A learner with no XP in the period is placed right after everyone who has some. Older servers
   * sent null for them instead.
   */
  me: { rank: number | null; xp: number };
}

export type SupportCategory = 'bug' | 'idea' | 'question' | 'other';
export type SupportStatus = 'new' | 'in_progress' | 'resolved';

export interface ApiSupportTicketInput {
  category: SupportCategory;
  message: string;
  contact?: string;
  /** Filled in by the app, so a bug report says which build and phone it came from. */
  app_version?: string;
  platform?: 'ios' | 'android' | 'web';
  os_version?: string;
  ui_language?: 'uz' | 'ru' | 'en';
}

export interface ApiSupportTicket {
  id: number;
  category: SupportCategory;
  message: string;
  status: SupportStatus;
  created_at: string;
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

export type MistakeCategory =
  | 'verb_form'
  | 'case_ending'
  | 'agreement'
  | 'word_order'
  | 'preposition'
  | 'article'
  | 'pronoun'
  | 'word_choice'
  | 'spelling'
  | 'other';

/** One entry of the mistakes notebook: a correction the tutor made, merged each time it is made again. */
export interface ApiNotebookMistake {
  id: string;
  language: StudyLanguage;
  said: string;
  correct: string;
  note: string | null;
  note_language: 'uz' | 'ru' | 'en' | null;
  category: MistakeCategory;
  occurrences: number;
  status: 'new' | 'learning' | 'known';
  repetitions: number;
  lapses: number;
  due_at: string;
  first_seen_at: string;
  last_seen_at: string;
  last_reviewed_at: string | null;
  conversation_id: string | null;
}

export interface ApiMistakeSummary {
  total: number;
  due: number;
  learning: number;
  mastered: number;
  next_due_at: string | null;
  /** Count per category, largest first. */
  categories: Partial<Record<MistakeCategory, number>>;
}

export type MistakeExercise = 'choice' | 'spot' | 'build';

export interface ApiMistakeAnswer {
  id: string;
  correct: boolean;
  exercise: MistakeExercise;
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

/** `POST /translations`: a translator answer, from the server's store when anyone asked it before. */
export interface ApiTranslation {
  source_language: string;
  target_language: string;
  translation: string;
  reading: string;
  stressed: string;
  corrected_input: string;
  meanings: { translation: string; part_of_speech: string; example: { source: string; target: string } | null }[];
  alternatives: { text: string; register: string }[];
  note: string;
}

export interface ApiTranslationQuery {
  text: string;
  /** A language code, or 'auto' to have it detected. */
  source: string;
  target: string;
  ui_language: 'uz' | 'ru' | 'en';
  uz_script: 'latin' | 'cyrillic';
}

/** A read-aloud line from the server's shared pool. */
export interface ApiPhrase {
  id: number;
  text: string;
  level: 'easy' | 'medium' | 'hard';
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

export type TurnPayload = ({ text: string } | { audio: string; mime: string }) & {
  tone?: TutorTone;
  /** Streamed turns: the voice may come as several `audio` events (with `text` and `last`). */
  clips?: boolean;
};

/**
 * Events of `POST /conversations/{id}/turns/stream`, in the order they arrive:
 * `transcript` (voice turns), `delta`… (the reply as it is written), `reply` (final text),
 * `audio` (once the voice is recorded; absent if that failed), `done`. `error` may replace any of them.
 */
export type TurnStreamEvent =
  | { event: 'transcript'; data: { text: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'reply'; data: { id?: number | null; reply: string; emotion: string } }
  /** With `clips`: one per piece, `url` null for a piece that failed. Without: once, for the whole reply. */
  | { event: 'audio'; data: { url: string | null; ms: number | null; text?: string; last?: boolean } }
  | { event: 'error'; data: { type?: string; status?: number } }
  | { event: 'done'; data: unknown };

export const endpoints = {
  /** Public, and answered without the `{ data }` envelope. */
  bootstrap: () => apiBody<{ scenarios: ApiScenario[] }>('/bootstrap'),

  /** `uiLanguage` becomes the language of a newly created profile; an existing one keeps its own. */
  signInWithGoogle: (idToken: string, device: string, uiLanguage: 'uz' | 'ru' | 'en') =>
    api<{ token: string; user: ApiUser }>('POST', '/auth/google', { body: { id_token: idToken, device, ui_language: uiLanguage } }),
  signOut: () => api<void>('DELETE', '/auth/session'),

  me: () => api<ApiUser>('GET', '/me'),
  updateMe: (patch: ApiProfilePatch) => api<ApiUser>('PUT', '/me', { body: patch }),
  uploadAvatar: (photo: FormData) => api<ApiUser>('POST', '/me/avatar', { body: photo, timeoutMs: UPLOAD_TIMEOUT_MS, idempotent: true }),
  deleteAvatar: () => api<ApiUser>('DELETE', '/me/avatar'),
  stats: () => api<ApiStats>('GET', '/stats'),
  certificateStatus: () => api<ApiCertificateStatus>('GET', '/certificate'),
  /** Safe to repeat: the server hands back the certificate already issued for this level. */
  issueCertificate: () => api<ApiCertificate>('POST', '/certificate', { idempotent: true }),
  certificateDocument: (serial: string) => api<{ html: string }>('GET', `/certificate/${serial}/document`),
  history: () => api<ApiHistoryItem[]>('GET', '/history'),
  /** Links set by the admin (the Telegram channel); null when there is none. */
  supportLinks: () => api<{ telegram_url: string | null }>('GET', '/support'),
  supportTickets: () => api<ApiSupportTicket[]>('GET', '/support/tickets'),
  sendSupportTicket: (ticket: ApiSupportTicketInput) => api<{ id: number; status: SupportStatus }>('POST', '/support/tickets', { body: ticket }),
  /** `month` is `YYYY-MM`; the current month when left out. */
  calendar: (month?: string) => api<ApiCalendar>('GET', month ? `/progress/calendar?month=${month}` : '/progress/calendar'),
  path: (language: StudyLanguage) => api<ApiPath>('GET', `/path?language=${language}`),
  leaderboard: (period: LeaderboardPeriod, limit: number) => api<ApiLeaderboard>('GET', `/leaderboard?period=${period}&limit=${limit}`),

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
  /** Stored answers come back at once; the server only asks the AI (and charges the quota) for new text. */
  translate: (query: ApiTranslationQuery, signal?: AbortSignal) =>
    api<ApiTranslation>('POST', '/translations', { body: query, timeoutMs: AI_TIMEOUT_MS, idempotent: true, signal }),
  /**
   * Lines to read aloud that this learner was never given (repeats only once the pool is exhausted
   * and the AI may not write more). Handing them out marks them seen, so never retried blindly.
   */
  nextPhrases: (language: StudyLanguage, level: 'easy' | 'medium' | 'hard', limit: number) =>
    api<ApiPhrase[]>('POST', '/pronunciation/phrases/next', { body: { language, level, limit }, timeoutMs: AI_TIMEOUT_MS }),
  syncWords: (cursor: string | null, changes: ApiUserWordChange[]) =>
    api<{ words: ApiUserWord[]; cursor: string }>('POST', '/vocabulary/sync', { body: { cursor, changes } }),
  /** The server ignores answers it has already logged, so a round is safe to resend. */
  reviewWords: (answers: ApiReviewAnswer[]) => api<{ xp: number }>('POST', '/vocabulary/reviews', { body: { answers }, idempotent: true }),

  mistakes: (language: StudyLanguage, options: { category?: MistakeCategory; cursor?: string | null } = {}) => {
    const query = new URLSearchParams({ language });
    if (options.category) query.set('category', options.category);
    if (options.cursor) query.set('cursor', options.cursor);
    return apiPage<ApiNotebookMistake>(`/mistakes?${query.toString()}`);
  },
  mistakeSummary: (language: StudyLanguage) => api<ApiMistakeSummary>('GET', `/mistakes/summary?language=${language}`),
  /** Due mistakes first, topped up with the ones not mastered yet. Reading it changes nothing. */
  mistakePractice: (language: StudyLanguage, limit = 10) => api<ApiNotebookMistake[]>('GET', `/mistakes/practice?language=${language}&limit=${limit}`),
  /** The server ignores answers it has already logged, so a round is safe to resend. */
  reviewMistakes: (answers: ApiMistakeAnswer[]) => api<{ xp: number }>('POST', '/mistakes/reviews', { body: { answers }, idempotent: true }),
  /** "Not a mistake": hidden for good, also when made again. Idempotent. */
  dismissMistake: (id: string) => api<void>('DELETE', `/mistakes/${id}`),
  restoreMistake: (id: string) => api<ApiNotebookMistake>('POST', `/mistakes/${id}/restore`, { idempotent: true }),

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
