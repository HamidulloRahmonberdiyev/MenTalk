import { readBase64, writeSpeechFile, type SpeechFile } from '@/services/gemini/audioFiles';
import { GeminiError, generateJson, generateText, synthesizeSpeech, type Content, type Part } from '@/services/gemini/client';
import { geminiConfig } from '@/services/gemini/config';
import {
  AUDIO_TURN_PROMPT,
  EVALUATION_SCHEMA,
  HINT_PROMPT,
  OPENING_PROMPT,
  TURN_SCHEMA,
  buildEvaluationPrompt,
  buildSystemPrompt,
  glossRule,
} from '@/services/gemini/prompts';
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
import { toSuggestions } from './suggestions';

/** Matches expo-audio's HIGH_QUALITY preset (AAC in an MPEG-4 container). */
const RECORDING_MIME = 'audio/mp4';
const SPEAKING_MS_PER_CHAR = 55;
const MAX_HISTORY_TURNS = 24;

interface RawMistake {
  wrong: string;
  wrongMark: string;
  correct: string;
  correctMark: string;
  note: string;
}

interface TurnResult {
  transcript: string;
  reply: string;
  emotion: TutorEmotion;
  mistakes: RawMistake[];
}

interface EvaluationResult {
  speech: number;
  vocabulary: number;
  grammar: number;
  mistakes: RawMistake[];
  newWords?: { word: string; form?: string; translation: string; example?: string }[];
}

type TurnInput = { kind: 'opening' } | { kind: 'audio'; audio: RecordedAudio } | { kind: 'text'; text: string };

const clampScore = (value: number) => Math.min(10, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

function noticeFor(error: unknown): NoticeCode {
  if (error instanceof GeminiError) return error.status === 429 ? 'quota' : 'turnFailed';
  return 'network';
}

class GeminiSession implements ConversationSession {
  private readonly listeners = new Set<ConversationListener>();
  private readonly system: string;
  private readonly startedAt = Date.now();
  /** Plain-text transcript of the conversation so far; the audio itself is only sent for the current turn. */
  private readonly history: Content[] = [];
  private readonly speechFiles: SpeechFile[] = [];
  /** Errors spotted during the chat; never shown live, only fed into the final evaluation. */
  private readonly loggedMistakes: RawMistake[] = [];
  private speakingTimer: ReturnType<typeof setTimeout> | null = null;
  private state: VoiceState = 'idle';
  private turn = 0;
  private learnerTurns = 0;
  private disposed = false;

  constructor(
    private readonly scenario: Scenario,
    private readonly learner: LearnerProfile,
  ) {
    this.system = buildSystemPrompt(scenario.id, learner);
  }

  subscribe(listener: ConversationListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async connect(): Promise<void> {
    await this.runTurn({ kind: 'opening' });
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
    void this.runTurn({ kind: 'audio', audio }).catch(() => undefined);
  }

  sendText(text: string): void {
    const clean = text.trim();
    if (!clean || this.state === 'thinking') return;
    this.clearSpeakingTimer();
    void this.runTurn({ kind: 'text', text: clean }).catch(() => undefined);
  }

  async requestHint(): Promise<string> {
    return generateText({
      system: this.system,
      contents: [...this.recentHistory(), { role: 'user', parts: [{ text: HINT_PROMPT }] }],
      temperature: 0.6,
    });
  }

  async end(): Promise<ConversationResult> {
    this.turn += 1;
    this.clearSpeakingTimer();
    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);

    if (this.learnerTurns === 0) {
      return {
        scenarioId: this.scenario.id,
        overall: 0,
        durationSec,
        metrics: [
          { id: 'speech', score: 0, max: 10 },
          { id: 'vocabulary', score: 0, max: 10 },
          { id: 'grammar', score: 0, max: 10 },
        ],
        mistakes: [],
      };
    }

    const transcript = this.history
      .map((item) => `${item.role === 'model' ? 'Anna' : 'Learner'}: ${(item.parts[0] as { text: string }).text}`)
      .join('\n');
    const evaluation = await generateJson<EvaluationResult>({
      system: this.system,
      contents: [{ role: 'user', parts: [{ text: buildEvaluationPrompt(transcript, this.loggedMistakes, glossRule(this.learner.uiLanguage)) }] }],
      schema: EVALUATION_SCHEMA,
      temperature: 0.2,
    });

    const speech = clampScore(evaluation.speech);
    const vocabulary = clampScore(evaluation.vocabulary);
    const grammar = clampScore(evaluation.grammar);
    return {
      scenarioId: this.scenario.id,
      overall: clampScore((speech + vocabulary + grammar) / 3),
      durationSec,
      metrics: [
        { id: 'speech', score: speech, max: 10 },
        { id: 'vocabulary', score: vocabulary, max: 10 },
        { id: 'grammar', score: grammar, max: 10 },
      ],
      mistakes: (evaluation.mistakes ?? []).slice(0, 3).map(
        (item, index): Mistake => ({
          id: `mistake-${index}`,
          wrong: item.wrong,
          wrongMark: item.wrongMark,
          correct: item.correct,
          correctMark: item.correctMark,
          note: item.note,
        }),
      ),
      newWords: toSuggestions(evaluation.newWords),
    };
  }

  dispose(): void {
    this.disposed = true;
    this.turn += 1;
    this.clearSpeakingTimer();
    this.listeners.clear();
    this.speechFiles.forEach((file) => file.delete());
    this.speechFiles.length = 0;
  }

  /**
   * One exchange: send the learner's input, receive the tutor's line, voice it, and publish it.
   * The opening turn rethrows so `connect()` can fail; later turns report a notice and go idle.
   */
  private async runTurn(input: TurnInput): Promise<void> {
    const id = ++this.turn;
    this.clearSpeakingTimer();
    this.setState('thinking');

    try {
      const parts = await this.partsFor(input);
      const result = await generateJson<TurnResult>({
        system: this.system,
        contents: [...this.recentHistory(), { role: 'user', parts }],
        schema: TURN_SCHEMA,
      });
      if (this.isStale(id)) return;

      const learnerText = input.kind === 'text' ? input.text : result.transcript?.trim();
      if (input.kind === 'audio' && learnerText) this.emit({ type: 'learnerMessage', text: learnerText });
      if (input.kind !== 'opening' && learnerText) {
        this.history.push({ role: 'user', parts: [{ text: learnerText }] });
        this.learnerTurns += 1;
        for (const item of result.mistakes ?? []) {
          if (item?.wrong && item.correct && item.wrong !== item.correct) this.loggedMistakes.push(item);
        }
      }
      this.history.push({ role: 'model', parts: [{ text: result.reply }] });

      const speech = await this.speak(result.reply);
      if (this.isStale(id)) return;

      this.emit({
        type: 'aiMessage',
        message: { id: `${this.scenario.id}-${id}`, text: result.reply, emotion: result.emotion, audioUri: speech?.uri },
      });
      this.setState('speaking');
      this.speakingTimer = setTimeout(() => {
        if (!this.isStale(id) && this.state === 'speaking') this.setState('idle');
      }, speech?.durationMs ?? result.reply.length * SPEAKING_MS_PER_CHAR);
    } catch (error) {
      if (this.isStale(id)) return;
      this.setState('idle');
      if (input.kind === 'opening') throw error;
      this.emit({ type: 'notice', code: noticeFor(error) });
    }
  }

  private async partsFor(input: TurnInput): Promise<Part[]> {
    switch (input.kind) {
      case 'opening':
        return [{ text: OPENING_PROMPT }];
      case 'text':
        return [{ text: `The learner typed: ${input.text}` }];
      case 'audio':
        return [
          { text: AUDIO_TURN_PROMPT },
          { inlineData: { mimeType: RECORDING_MIME, data: await readBase64(input.audio.uri) } },
        ];
    }
  }

  /** Synthesizes the line with Gemini. Any failure falls back to the device voice (no audio file). */
  private async speak(text: string): Promise<SpeechFile | null> {
    if (!geminiConfig.ttsEnabled) return null;
    try {
      const file = writeSpeechFile(`tutor-${Date.now()}`, await synthesizeSpeech(text));
      this.speechFiles.push(file);
      return file;
    } catch (error) {
      if (__DEV__) console.warn('Gemini TTS failed, using the device voice:', error);
      return null;
    }
  }

  /** The API wants a conversation that starts with the user, so a greeting-only history gets a stand-in opener. */
  private recentHistory(): Content[] {
    const recent = this.history.slice(-MAX_HISTORY_TURNS);
    return recent[0]?.role === 'model' ? [{ role: 'user', parts: [{ text: '(the learner joins the conversation)' }] }, ...recent] : recent;
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

export class GeminiConversationService implements ConversationService {
  createSession(scenario: Scenario, learner: LearnerProfile): ConversationSession {
    return new GeminiSession(scenario, learner);
  }
}
