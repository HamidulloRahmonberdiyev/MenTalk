import type { TranslationKey } from '@/i18n';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type ScenarioId = 'intro' | 'cafe' | 'shop' | 'taxi' | 'work' | 'airport';

export interface Scenario {
  id: ScenarioId;
  icon: IconName;
  tint: string;
  gradient: readonly [string, string];
}

/** Turn-taking state of the voice conversation. */
export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface AiMessage {
  id: string;
  text: string;
}

export type MetricId = 'speech' | 'vocabulary' | 'grammar';

export interface Metric {
  id: MetricId;
  score: number;
  max: number;
}

export interface Mistake {
  id: string;
  wrong: string;
  /** Fragment of `wrong` to highlight. */
  wrongMark: string;
  correct: string;
  /** Fragment of `correct` to highlight. */
  correctMark: string;
  note: TranslationKey;
}

export interface ConversationResult {
  scenarioId: ScenarioId;
  overall: number;
  durationSec: number;
  metrics: Metric[];
  mistakes: Mistake[];
}

export interface HistoryEntry {
  id: string;
  scenarioId: ScenarioId;
  durationSec: number;
  score: number;
  date: number;
}

export type Gender = 'male' | 'female' | 'unspecified';
export type RussianLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';
export type LearningGoal = 'travel' | 'work' | 'study' | 'relocation' | 'family' | 'fun';

export interface UserProfile {
  name: string;
  onboarded: boolean;
  gender: Gender | null;
  /** ISO date (YYYY-MM-DD). */
  birthDate: string | null;
  level: RussianLevel | null;
  goals: LearningGoal[];
  dailyGoalMinutes: number;
  minutesToday: number;
  lastScenarioId: ScenarioId | null;
  history: HistoryEntry[];
}
