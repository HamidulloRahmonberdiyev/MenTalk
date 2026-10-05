/**
 * End-of-speech detection from microphone loudness. Pure logic with no React or native imports,
 * so it can be tested with simulated level streams (see scripts/endpoint-check.mjs).
 *
 * It answers one question, tick by tick: has the person started talking, and have they finished?
 * Three things keep it dependable in the real world:
 *  - the room's noise floor is learned, so a quiet room and a noisy street both work;
 *  - "silence" is relative to how loudly *this* person speaks, so a soft talker's pause is still a pause;
 *  - the wait before sending shrinks as the sentence gets longer, so replies feel instant without
 *    cutting people off mid-thought.
 */

export type EndpointDecision =
  /** Keep recording. */
  | 'continue'
  /** Speech happened and the speaker has stopped: send it. */
  | 'end'
  /** Nobody said anything for too long: close the mic without sending. */
  | 'noSpeech'
  /** The device gives no loudness readings, so silence cannot be detected. */
  | 'unsupported';

export interface EndpointConfig {
  /** Interval between `push` calls, in ms. */
  tickMs: number;
  /** Speech must last this long to count as a turn (ignores clicks and coughs). */
  minSpeechMs: number;
  /** Pause that ends a turn, by how long the person has spoken so far. */
  silenceAfterShortMs: number;
  silenceAfterMediumMs: number;
  silenceAfterLongMs: number;
  /** Give up if nothing is said for this long. */
  noSpeechMs: number;
  /** Hard cap on a single turn. */
  maxTurnMs: number;
  /** dBFS: never treat anything quieter than this as speech. */
  minStartDb: number;
  /** Speech must rise this far above the noise floor to start. */
  startMarginDb: number;
  /** A pause is anything this far below the speaker's own average speech level. */
  pauseBelowSpeechDb: number;
  /** ...but never closer than this to the noise floor. */
  pauseAboveFloorDb: number;
  /** Consecutive missing readings before the detector reports `unsupported`. */
  missingReadingsLimit: number;
}

export const DEFAULT_ENDPOINT_CONFIG: EndpointConfig = {
  tickMs: 50,
  minSpeechMs: 250,
  silenceAfterShortMs: 1000,
  silenceAfterMediumMs: 850,
  silenceAfterLongMs: 700,
  noSpeechMs: 7000,
  maxTurnMs: 30_000,
  minStartDb: -42,
  startMarginDb: 11,
  pauseBelowSpeechDb: 16,
  pauseAboveFloorDb: 8,
  missingReadingsLimit: 20,
};

const MAX_FLOOR_DB = -32;
const FLOOR_RISE_PER_TICK = 0.015;
const SMOOTHING = 0.5;
const SPEECH_LEVEL_SMOOTHING = 0.06;

export class SpeechEndpointDetector {
  private readonly config: EndpointConfig;
  private floor = -55;
  private smoothed = -160;
  private speechLevel = -160;
  private voicedMs = 0;
  private totalSpeechMs = 0;
  private silentMs = 0;
  private missing = 0;
  private startedAt: number | null = null;
  private spoke = false;

  constructor(config: Partial<EndpointConfig> = {}) {
    this.config = { ...DEFAULT_ENDPOINT_CONFIG, ...config };
  }

  /** True once enough speech has been heard to count as a turn. */
  get hasSpoken(): boolean {
    return this.spoke;
  }

  /** Loudness mapped to 0..1 for visuals. */
  get level(): number {
    return Math.min(Math.max((this.smoothed + 60) / 60, 0), 1);
  }

  /** Feed one loudness reading (dBFS, or undefined if unavailable) taken at time `now` (ms). */
  push(db: number | undefined, now: number): EndpointDecision {
    const { config } = this;
    this.startedAt ??= now;
    const elapsed = now - this.startedAt;

    if (db === undefined || !Number.isFinite(db)) {
      this.missing += 1;
      if (this.missing >= config.missingReadingsLimit) return 'unsupported';
      return this.limits(elapsed);
    }
    this.missing = 0;

    this.smoothed = this.smoothed <= -150 ? db : this.smoothed * SMOOTHING + db * (1 - SMOOTHING);
    // The floor falls to quieter readings at once and creeps up slowly, so steady noise stays "floor".
    this.floor = db < this.floor ? db : Math.min(this.floor + (db - this.floor) * FLOOR_RISE_PER_TICK, MAX_FLOOR_DB);

    const startAt = Math.max(config.minStartDb, this.floor + config.startMarginDb);
    const voiced = this.smoothed > startAt;

    if (voiced) {
      this.voicedMs += config.tickMs;
      this.totalSpeechMs += config.tickMs;
      this.speechLevel =
        this.speechLevel <= -150 ? this.smoothed : this.speechLevel + (this.smoothed - this.speechLevel) * SPEECH_LEVEL_SMOOTHING;
      if (this.voicedMs >= config.minSpeechMs) this.spoke = true;
    } else {
      // Brief dips inside a word do not reset the onset counter, they only drain it.
      this.voicedMs = Math.max(0, this.voicedMs - config.tickMs / 2);
    }

    if (this.spoke) {
      this.silentMs = this.smoothed < this.pauseBelow() ? this.silentMs + config.tickMs : 0;
    }

    if (this.spoke && this.silentMs >= this.silenceNeeded()) return 'end';
    return this.limits(elapsed);
  }

  private limits(elapsed: number): EndpointDecision {
    if (elapsed >= this.config.maxTurnMs) return this.spoke ? 'end' : 'noSpeech';
    if (!this.spoke && elapsed >= this.config.noSpeechMs) return 'noSpeech';
    return 'continue';
  }

  /** Level below which the speaker counts as paused: relative to their own voice, but above the room's noise. */
  private pauseBelow(): number {
    return Math.max(this.speechLevel - this.config.pauseBelowSpeechDb, this.floor + this.config.pauseAboveFloorDb);
  }

  private silenceNeeded(): number {
    const { config, totalSpeechMs } = this;
    if (totalSpeechMs < 1200) return config.silenceAfterShortMs;
    if (totalSpeechMs < 4000) return config.silenceAfterMediumMs;
    return config.silenceAfterLongMs;
  }
}
