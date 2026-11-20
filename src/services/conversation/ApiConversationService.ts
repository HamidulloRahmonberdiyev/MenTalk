import {
  endpoints,
  type ApiResult,
  type ApiStartedConversation,
  type ApiTurn,
  type TurnPayload,
  type TurnStreamEvent,
} from '@/services/api/endpoints';
import { ApiError, NetworkError } from '@/services/api/http';
import { StreamUnsupportedError } from '@/services/api/stream';
import { readBase64 } from '@/services/gemini/audioFiles';
import type { StudyLanguage } from '@/services/learning';
import type { AiMessage, ConversationResult, LearnerProfile, Mistake, Scenario, TutorEmotion, TutorTone, VoiceState } from '@/types';

import {
  ConnectError,
  type ConversationEvent,
  type ConversationListener,
  type ConversationService,
  type ConversationSession,
  type NoticeCode,
  type RecordedAudio,
  type Unsubscribe,
} from './ConversationService';
import { differingPart } from './markDiff';
import { toSuggestions } from './suggestions';

/** Matches expo-audio's HIGH_QUALITY preset (AAC in an MPEG-4 container). */
const RECORDING_MIME = 'audio/mp4';
const SPEAKING_MS_PER_CHAR = 55;
/** A normal turn answers in a few seconds; past this the learner is told the connection is slow. */
const SLOW_TURN_MS = 12_000;
/**
 * Waits before each new try of a turn whose reply never arrived (a dropped connection, a server still
 * busy with the previous turn). Safe because every try carries the turn's `client_id`: the server
 * answers and charges it once, and a try that comes after it was answered gets that same answer.
 */
const RETRY_DELAYS_MS = [1_000, 2_500, 5_000];
/**
 * Whether this server streams turns. Unknown until the first turn tries; an old server answers the
 * stream route with 404 once, and every later turn in the app's lifetime goes straight to `/turns`.
 */
let streamingSupported: boolean | null = null;

/** A stream that ended without a reply, or reported an error event. */
class StreamFailed extends Error {
  constructor(
    readonly code: NoticeCode,
    /** The reply simply did not come (cut short, model busy): the same turn may well get one if sent again. */
    readonly retryable: boolean,
  ) {
    super(`Turn stream failed: ${code}`);
    this.name = 'StreamFailed';
  }
}

/** What `connect()` waits on while the tutor's first line streams in. */
interface TurnHooks {
  /** The first words of the reply are on screen. */
  onShown?: () => void;
  /** The turn failed before anything was shown. True when the caller reports it, instead of the usual notice. */
  onFailed?: (error: unknown) => boolean;
}

const EMOTIONS: readonly TutorEmotion[] = ['neutral', 'happy', 'encouraging', 'curious', 'empathetic', 'surprised', 'playful'];

const newClientId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function noticeFor(error: unknown): NoticeCode {
  if (error instanceof StreamFailed) return error.code;
  if (error instanceof NetworkError) return 'network';
  if (error instanceof ApiError) {
    if (error.type === 'quota') return 'quota';
    if (error.type === 'turn_in_progress') return 'busy';
  }
  // The server answered, so the connection is fine; the turn itself failed.
  return 'turnFailed';
}

/** Failures where the reply never arrived, so sending the same turn again is the cure. */
function worthRetrying(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof StreamFailed) return error.retryable;
  if (error instanceof ApiError) return error.type === 'turn_in_progress' || [502, 503, 504].includes(error.status);
  return false;
}

const emotionOf = (value: string): TutorEmotion => (EMOTIONS.includes(value as TutorEmotion) ? (value as TutorEmotion) : 'neutral');

function toResult(scenarioId: Scenario['id'], language: StudyLanguage, durationSec: number, result: ApiResult): ConversationResult {
  return {
    scenarioId,
    overall: result.overall,
    durationSec,
    metrics: [
      { id: 'speech', score: result.speech, max: 10 },
      { id: 'vocabulary', score: result.vocabulary, max: 10 },
      { id: 'grammar', score: result.grammar, max: 10 },
    ],
    mistakes: result.mistakes.slice(0, 3).map(
      (item, index): Mistake => ({
        id: `mistake-${index}`,
        wrong: item.said,
        wrongMark: differingPart(item.said, item.correct),
        correct: item.correct,
        correctMark: differingPart(item.correct, item.said),
        note: item.note || undefined,
      }),
    ),
    newWords: toSuggestions(result.new_words, language),
  };
}

/** A conversation held on the MenTalk server: it owns the prompts, the history, the voice and the scoring. */
class ApiSession implements ConversationSession {
  private readonly listeners = new Set<ConversationListener>();
  private readonly startedAt = Date.now();
  private conversationId: number | null = null;
  private speakingTimer: ReturnType<typeof setTimeout> | null = null;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private state: VoiceState = 'idle';
  private turn = 0;
  private disposed = false;
  /** Cancels the request of the turn in flight when a newer turn starts or the screen closes. */
  private inFlight: AbortController | null = null;

  constructor(
    private readonly scenario: Scenario,
    private readonly language: StudyLanguage,
    private tone: TutorTone,
    /** Kept by the server for the whole conversation: every line, and every retry of one, in this voice. */
    private readonly voiceId: number | null = null,
  ) {}

  setTone(tone: TutorTone): void {
    this.tone = tone;
  }

  subscribe(listener: ConversationListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Creates the conversation (no model involved, so it is quick) and resolves as soon as the tutor's
   * first words are on screen; the rest of the line streams in like any reply. Fails only when the
   * conversation could not start or the first line never came.
   */
  async connect(): Promise<void> {
    this.setState('thinking');
    let started: ApiStartedConversation;
    try {
      started = await endpoints.startConversation(this.scenario.id, this.language, this.tone, this.voiceId);
    } catch (error) {
      if (!this.disposed) this.setState('idle');
      throw new ConnectError(noticeFor(error), error);
    }
    this.conversationId = started.conversation_id;

    // An older server wrote the first line before it answered.
    if (started.reply !== undefined) {
      this.publish(++this.turn, started as ApiTurn);
      return;
    }

    await new Promise<void>((resolve, reject) => {
      void this.runTurn(async () => ({ opening: true }), {
        onShown: resolve,
        onFailed: (error) => {
          reject(new ConnectError(noticeFor(error), error));
          return true;
        },
      });
    });
  }

  startListening(): void {
    if (this.state === 'thinking') return;
    this.clearSpeakingTimer();
    this.setState('listening');
  }

  stopListening(): void {
    this.cancelListening();
  }

  cancelListening(): void {
    if (this.state === 'listening') this.setState('idle');
  }

  sendAudio(audio: RecordedAudio): void {
    if (this.state !== 'listening') return;
    void this.runTurn(async () => ({ audio: await readBase64(audio.uri), mime: RECORDING_MIME }));
  }

  sendText(text: string): void {
    const clean = text.trim();
    if (!clean || this.state === 'thinking') return;
    void this.runTurn(async () => ({ text: clean }));
  }

  async requestHint(): Promise<string> {
    return (await endpoints.hint(this.requireId())).hint;
  }

  async end(): Promise<ConversationResult> {
    this.turn += 1;
    this.clearSpeakingTimer();
    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    return toResult(this.scenario.id, this.language, durationSec, await endpoints.finish(this.requireId()));
  }

  async fetchVoice(turnId: number, text: string): Promise<string | null> {
    if (this.conversationId === null || this.disposed) return null;
    try {
      return (await endpoints.turnSpeech(this.conversationId, turnId, text)).url;
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.turn += 1;
    this.inFlight?.abort();
    this.clearSpeakingTimer();
    this.clearSlowTimer();
    this.listeners.clear();
  }

  private async runTurn(payload: () => Promise<TurnPayload>, hooks: TurnHooks = {}): Promise<void> {
    const id = ++this.turn;
    this.inFlight?.abort();
    const controller = new AbortController();
    this.inFlight = controller;
    this.clearSpeakingTimer();
    this.setState('thinking');
    this.slowTimer = setTimeout(() => {
      if (!this.isStale(id) && this.state === 'thinking') this.emit({ type: 'notice', code: 'slow' });
    }, SLOW_TURN_MS);
    let shown = false;
    const markShown = () => {
      if (shown) return;
      shown = true;
      hooks.onShown?.();
    };
    try {
      // One id for every try of this turn, so the server answers it once however often it is sent.
      const body: TurnPayload = { ...(await payload()), tone: this.tone, client_id: newClientId() };
      if (this.isStale(id)) return;
      if (streamingSupported !== false) {
        try {
          await this.streamWithRetry(id, body, controller.signal, markShown);
          streamingSupported = true;
          return;
        } catch (error) {
          if (!(error instanceof StreamUnsupportedError)) throw error;
          streamingSupported = false;
        }
      }
      const turn = await endpoints.sendTurn(this.requireId(), body, controller.signal);
      if (this.isStale(id)) return;
      if (turn.transcript) this.emit({ type: 'learnerMessage', text: turn.transcript });
      this.publish(id, turn);
      markShown();
    } catch (error) {
      if (this.isStale(id)) return;
      this.setState('idle');
      if (shown || !hooks.onFailed?.(error)) this.emit({ type: 'notice', code: noticeFor(error) });
    } finally {
      this.clearSlowTimer();
      if (this.inFlight === controller) this.inFlight = null;
    }
  }

  /**
   * Streams the turn, and sends it again when its reply never arrived. Once the reply is on screen the
   * turn is done whatever happens to the stream after it: a voice that did not follow is asked for
   * again by the player (`fetchVoice`), never by repeating the turn.
   */
  private async streamWithRetry(id: number, body: TurnPayload, signal: AbortSignal, onShown: () => void): Promise<void> {
    for (let attempt = 0; ; attempt += 1) {
      const progress = { replied: false };
      try {
        await this.streamTurn(id, body, signal, progress, onShown);
        return;
      } catch (error) {
        if (progress.replied) return;
        if (signal.aborted || this.isStale(id) || attempt >= RETRY_DELAYS_MS.length || !worthRetrying(error)) throw error;
        if (error instanceof NetworkError) this.emit({ type: 'notice', code: 'reconnecting' });
        await delay(RETRY_DELAYS_MS[attempt]);
        if (signal.aborted || this.isStale(id)) throw error;
      }
    }
  }

  /**
   * The fast path: the reply is shown word by word as the model writes it, and voiced as soon as the
   * server has recorded it, instead of waiting for text and voice together.
   */
  private async streamTurn(
    id: number,
    body: TurnPayload,
    signal: AbortSignal,
    progress: { replied: boolean },
    onShown: () => void,
  ): Promise<void> {
    const messageId = `${this.scenario.id}-live-${id}`;
    let message: AiMessage | null = null;
    let voicedMs = 0;
    let voiceStart: number | null = null;

    const show = (next: AiMessage) => {
      message = next;
      this.emit({ type: 'aiMessage', message: next });
    };

    const onEvent = (event: TurnStreamEvent) => {
      if (this.isStale(id)) return;
      switch (event.event) {
        case 'transcript':
          if (event.data.text) this.emit({ type: 'learnerMessage', text: event.data.text });
          break;
        case 'delta':
          if (progress.replied || !event.data.text) break;
          this.clearSlowTimer();
          show({ id: messageId, text: (message?.text ?? '') + event.data.text, streaming: true });
          onShown();
          break;
        case 'reply':
          progress.replied = true;
          this.clearSlowTimer();
          show({ id: messageId, text: event.data.reply, emotion: emotionOf(event.data.emotion), audioPending: true });
          onShown();
          this.setState('speaking');
          this.holdSpeaking(id, event.data.reply.length * SPEAKING_MS_PER_CHAR);
          break;
        case 'audio': {
          if (!message || !progress.replied) break;
          const { url, ms, text, last } = event.data;
          if (text === undefined) {
            show({ ...message, audioPending: false, audioUri: url ?? undefined });
            if (ms) this.holdSpeaking(id, ms);
            break;
          }
          // One piece of the voice: the tutor starts talking on the first, the rest queue behind it.
          const current: AiMessage = message;
          show({ ...current, audioPending: !last, clips: [...(current.clips ?? []), { uri: url, text }] });
          // The pieces play back to back from the first one's arrival, so the turn ends when they all have.
          voiceStart ??= Date.now();
          voicedMs += ms ?? text.length * SPEAKING_MS_PER_CHAR;
          this.holdSpeaking(id, voiceStart + voicedMs - Date.now());
          break;
        }
        case 'saved':
        case 'done': {
          // The line is stored: a piece of its voice that failed can now be asked for by this id.
          const turnId = event.data?.id;
          if (message && progress.replied && typeof turnId === 'number' && message.turnId !== turnId) show({ ...message, turnId });
          break;
        }
        case 'error':
          throw new StreamFailed(noticeFor(new ApiError(event.data.status ?? 500, event.data.type)), event.data.status === 503);
      }
    };

    try {
      await endpoints.streamTurn(this.requireId(), { ...body, clips: true }, onEvent, signal);
    } finally {
      // However the stream ended (done, cut short, failed after the reply), no more voice will come for
      // this line: say so, so the player stops waiting for it now instead of after a timeout.
      const last = message as AiMessage | null;
      if (!this.isStale(id) && last?.audioPending) show({ ...last, audioPending: false });
    }
    if (this.isStale(id)) return;
    if (!progress.replied) throw new StreamFailed('turnFailed', true);
  }

  private publish(id: number, turn: ApiTurn): void {
    if (this.isStale(id)) return;
    this.emit({
      type: 'aiMessage',
      message: {
        id: `${this.scenario.id}-${turn.id}`,
        turnId: turn.id,
        text: turn.reply,
        emotion: emotionOf(turn.emotion),
        audioUri: turn.audio_url ?? undefined,
      },
    });
    this.setState('speaking');
    this.holdSpeaking(id, turn.audio_ms ?? turn.reply.length * SPEAKING_MS_PER_CHAR);
  }

  /** Stays in `speaking` for about as long as the line takes to say, then hands the floor back. */
  private holdSpeaking(id: number, durationMs: number): void {
    this.clearSpeakingTimer();
    this.speakingTimer = setTimeout(() => {
      if (!this.isStale(id) && this.state === 'speaking') this.setState('idle');
    }, durationMs);
  }

  private requireId(): number {
    if (this.conversationId === null) throw new Error('Conversation has not started');
    return this.conversationId;
  }

  private isStale(turn: number): boolean {
    return this.disposed || turn !== this.turn;
  }

  private setState(state: VoiceState): void {
    this.state = state;
    this.emit({ type: 'state', state });
  }

  private emit(event: ConversationEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private clearSpeakingTimer(): void {
    if (this.speakingTimer) clearTimeout(this.speakingTimer);
    this.speakingTimer = null;
  }

  private clearSlowTimer(): void {
    if (this.slowTimer) clearTimeout(this.slowTimer);
    this.slowTimer = null;
  }
}

export class ApiConversationService implements ConversationService {
  readonly serverVoiced = true;

  createSession(scenario: Scenario, learner: LearnerProfile): ConversationSession {
    return new ApiSession(scenario, learner.studyLanguage, learner.tone, learner.tutorVoiceId ?? null);
  }
}
