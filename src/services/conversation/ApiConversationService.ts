import { endpoints, type ApiResult, type ApiTurn, type TurnPayload } from '@/services/api/endpoints';
import { ApiError } from '@/services/api/http';
import { readBase64 } from '@/services/gemini/audioFiles';
import type { ConversationResult, LearnerProfile, Mistake, Scenario, TutorEmotion, VoiceState } from '@/types';

import type {
  ConversationEvent,
  ConversationListener,
  ConversationService,
  ConversationSession,
  NoticeCode,
  RecordedAudio,
  Unsubscribe,
} from './ConversationService';
import { differingPart } from './markDiff';
import { toSuggestions } from './suggestions';

/** Matches expo-audio's HIGH_QUALITY preset (AAC in an MPEG-4 container). */
const RECORDING_MIME = 'audio/mp4';
const SPEAKING_MS_PER_CHAR = 55;
const EMOTIONS: readonly TutorEmotion[] = ['neutral', 'happy', 'encouraging', 'curious', 'empathetic', 'surprised', 'playful'];

function noticeFor(error: unknown): NoticeCode {
  if (error instanceof ApiError) {
    if (error.type === 'quota') return 'quota';
    return error.status === 502 ? 'turnFailed' : 'network';
  }
  return 'network';
}

const emotionOf = (value: string): TutorEmotion => (EMOTIONS.includes(value as TutorEmotion) ? (value as TutorEmotion) : 'neutral');

function toResult(scenarioId: Scenario['id'], durationSec: number, result: ApiResult): ConversationResult {
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
    newWords: toSuggestions(result.new_words),
  };
}

/** A conversation held on the MenTalk server: it owns the prompts, the history, the voice and the scoring. */
class ApiSession implements ConversationSession {
  private readonly listeners = new Set<ConversationListener>();
  private readonly startedAt = Date.now();
  private conversationId: number | null = null;
  private speakingTimer: ReturnType<typeof setTimeout> | null = null;
  private state: VoiceState = 'idle';
  private turn = 0;
  private disposed = false;

  constructor(private readonly scenario: Scenario) {}

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
      const opening = await endpoints.startConversation(this.scenario.id);
      this.conversationId = opening.conversation_id;
      this.publish(id, opening);
    } catch (error) {
      if (!this.isStale(id)) this.setState('idle');
      throw error;
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
    return toResult(this.scenario.id, durationSec, await endpoints.finish(this.requireId()));
  }

  dispose(): void {
    this.disposed = true;
    this.turn += 1;
    this.clearSpeakingTimer();
    this.listeners.clear();
  }

  private async runTurn(payload: () => Promise<TurnPayload>): Promise<void> {
    const id = ++this.turn;
    this.clearSpeakingTimer();
    this.setState('thinking');
    try {
      const turn = await endpoints.sendTurn(this.requireId(), await payload());
      if (this.isStale(id)) return;
      if (turn.transcript) this.emit({ type: 'learnerMessage', text: turn.transcript });
      this.publish(id, turn);
    } catch (error) {
      if (this.isStale(id)) return;
      this.setState('idle');
      // 409: the previous turn is still being processed on the server; nothing to tell the learner.
      if (!(error instanceof ApiError && error.type === 'turn_in_progress')) this.emit({ type: 'notice', code: noticeFor(error) });
    }
  }

  private publish(id: number, turn: ApiTurn): void {
    if (this.isStale(id)) return;
    this.emit({
      type: 'aiMessage',
      message: { id: `${this.scenario.id}-${turn.id}`, text: turn.reply, emotion: emotionOf(turn.emotion), audioUri: turn.audio_url ?? undefined },
    });
    this.setState('speaking');
    this.speakingTimer = setTimeout(() => {
      if (!this.isStale(id) && this.state === 'speaking') this.setState('idle');
    }, turn.audio_ms ?? turn.reply.length * SPEAKING_MS_PER_CHAR);
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
}

export class ApiConversationService implements ConversationService {
  createSession(scenario: Scenario, _learner: LearnerProfile): ConversationSession {
    return new ApiSession(scenario);
  }
}
