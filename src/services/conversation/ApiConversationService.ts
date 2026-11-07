import { endpoints, type ApiResult, type ApiTurn, type TurnPayload, type TurnStreamEvent } from '@/services/api/endpoints';
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
 * Whether this server streams turns. Unknown until the first turn tries; an old server answers the
 * stream route with 404 once, and every later turn in the app's lifetime goes straight to `/turns`.
 */
let streamingSupported: boolean | null = null;

/** A stream that ended without a reply, or reported an error event. */
class StreamFailed extends Error {
  constructor(readonly code: NoticeCode) {
    super(`Turn stream failed: ${code}`);
    this.name = 'StreamFailed';
  }
}

const EMOTIONS: readonly TutorEmotion[] = ['neutral', 'happy', 'encouraging', 'curious', 'empathetic', 'surprised', 'playful'];

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

  async connect(): Promise<void> {
    const id = ++this.turn;
    this.setState('thinking');
    try {
      const opening = await endpoints.startConversation(this.scenario.id, this.language, this.tone);
      this.conversationId = opening.conversation_id;
      this.publish(id, opening);
    } catch (error) {
      if (!this.isStale(id)) this.setState('idle');
      throw new ConnectError(noticeFor(error), error);
    }
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

  dispose(): void {
    this.disposed = true;
    this.turn += 1;
    this.inFlight?.abort();
    this.clearSpeakingTimer();
    this.clearSlowTimer();
    this.listeners.clear();
  }

  private async runTurn(payload: () => Promise<TurnPayload>): Promise<void> {
    const id = ++this.turn;
    this.inFlight?.abort();
    const controller = new AbortController();
    this.inFlight = controller;
    this.clearSpeakingTimer();
    this.setState('thinking');
    this.slowTimer = setTimeout(() => {
      if (!this.isStale(id) && this.state === 'thinking') this.emit({ type: 'notice', code: 'slow' });
    }, SLOW_TURN_MS);
    try {
      const body: TurnPayload = { ...(await payload()), tone: this.tone };
      if (this.isStale(id)) return;
      if (streamingSupported !== false) {
        try {
          await this.streamTurn(id, body, controller.signal);
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
    } catch (error) {
      if (this.isStale(id)) return;
      this.setState('idle');
      this.emit({ type: 'notice', code: noticeFor(error) });
    } finally {
      this.clearSlowTimer();
      if (this.inFlight === controller) this.inFlight = null;
    }
  }

  /**
   * The fast path: the reply is shown word by word as the model writes it, and voiced as soon as the
   * server has recorded it, instead of waiting for text and voice together.
   */
  private async streamTurn(id: number, body: TurnPayload, signal: AbortSignal): Promise<void> {
    const messageId = `${this.scenario.id}-live-${id}`;
    let message: AiMessage | null = null;
    let final = false;
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
          if (final || !event.data.text) break;
          this.clearSlowTimer();
          show({ id: messageId, text: (message?.text ?? '') + event.data.text, streaming: true });
          break;
        case 'reply':
          final = true;
          this.clearSlowTimer();
          show({ id: messageId, text: event.data.reply, emotion: emotionOf(event.data.emotion), audioPending: true });
          this.setState('speaking');
          this.holdSpeaking(id, event.data.reply.length * SPEAKING_MS_PER_CHAR);
          break;
        case 'audio': {
          if (!message || !final) break;
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
        case 'error':
          throw new StreamFailed(noticeFor(new ApiError(event.data.status ?? 500, event.data.type)));
      }
    };

    await endpoints.streamTurn(this.requireId(), { ...body, clips: true }, onEvent, signal);
    if (this.isStale(id)) return;
    if (!final) throw new StreamFailed('turnFailed');
    // The stream ended with the voice missing or cut short: stop waiting, so the device voice reads what is left now.
    const last = message as AiMessage | null;
    if (last?.audioPending) show({ ...last, audioPending: false });
  }

  private publish(id: number, turn: ApiTurn): void {
    if (this.isStale(id)) return;
    this.emit({
      type: 'aiMessage',
      message: { id: `${this.scenario.id}-${turn.id}`, text: turn.reply, emotion: emotionOf(turn.emotion), audioUri: turn.audio_url ?? undefined },
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
  createSession(scenario: Scenario, learner: LearnerProfile): ConversationSession {
    return new ApiSession(scenario, learner.studyLanguage, learner.tone);
  }
}
