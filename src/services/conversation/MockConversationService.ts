import { CONVERSATION_SCRIPTS, type ConversationScript } from '@/mocks/conversationScripts';
import { createMockResult } from '@/mocks/results';
import type { ConversationResult, LearnerProfile, Scenario, VoiceState } from '@/types';

import type {
  ConversationEvent,
  ConversationListener,
  ConversationService,
  ConversationSession,
  RecordedAudio,
  Unsubscribe,
} from './ConversationService';

const CONNECT_DELAY_MS = 700;
const THINKING_DELAY_MS = 1300;
const HINT_DELAY_MS = 450;
const SPEAKING_MS_PER_CHAR = 55;

class MockConversationSession implements ConversationSession {
  private readonly listeners = new Set<ConversationListener>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly script: ConversationScript;
  private readonly startedAt = Date.now();
  private turn = 0;
  private state: VoiceState = 'idle';
  private disposed = false;

  constructor(private readonly scenario: Scenario) {
    this.script = CONVERSATION_SCRIPTS[scenario.id];
  }

  subscribe(listener: ConversationListener): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async connect(): Promise<void> {
    await this.wait(CONNECT_DELAY_MS);
    this.reply();
  }

  startListening(): void {
    if (this.state === 'thinking') return;
    this.clearTimers();
    this.setState('listening');
  }

  stopListening(): void {
    if (this.state !== 'listening') return;
    this.reply();
  }

  /** Mock analysis: a real provider would send `audio` to the speech model here. */
  sendAudio(_audio: RecordedAudio): void {
    if (this.state !== 'listening') return;
    this.reply();
  }

  cancelListening(): void {
    if (this.state === 'listening') this.setState('idle');
  }

  sendText(text: string): void {
    if (text.trim().length === 0 || this.state === 'thinking') return;
    this.clearTimers();
    this.reply();
  }

  async requestHint(): Promise<string> {
    await this.wait(HINT_DELAY_MS);
    const index = Math.min(Math.max(this.turn - 1, 0), this.script.hints.length - 1);
    return this.script.hints[index];
  }

  async end(): Promise<ConversationResult> {
    this.clearTimers();
    await this.wait(400);
    const durationSec = Math.round((Date.now() - this.startedAt) / 1000);
    return createMockResult(this.scenario.id, durationSec);
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimers();
    this.listeners.clear();
  }

  /** Thinking → speaking → idle, delivering the next scripted line. */
  private reply(): void {
    this.setState('thinking');
    this.schedule(THINKING_DELAY_MS, () => {
      const text = this.script.aiLines[Math.min(this.turn, this.script.aiLines.length - 1)];
      const id = `${this.scenario.id}-${this.turn}`;
      this.turn += 1;
      this.emit({ type: 'aiMessage', message: { id, text } });
      this.setState('speaking');
      this.schedule(text.length * SPEAKING_MS_PER_CHAR, () => this.setState('idle'));
    });
  }

  private setState(state: VoiceState): void {
    this.state = state;
    this.emit({ type: 'state', state });
  }

  private emit(event: ConversationEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private schedule(delayMs: number, task: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (!this.disposed) task();
    }, delayMs);
    this.timers.add(timer);
  }

  private wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, delayMs);
      this.timers.add(timer);
    });
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}

export class MockConversationService implements ConversationService {
  createSession(scenario: Scenario, _learner: LearnerProfile): ConversationSession {
    return new MockConversationSession(scenario);
  }
}
