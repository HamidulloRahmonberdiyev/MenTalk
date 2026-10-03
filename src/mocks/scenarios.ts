import type { Scenario, ScenarioId } from '@/types';

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'intro',
    icon: 'people',
    tint: '#2AABEE',
    gradient: ['#5CC3F2', '#1E88C7'],
  },
  {
    id: 'cafe',
    icon: 'cafe',
    tint: '#EF5B4C',
    gradient: ['#B07A50', '#4A2F1F'],
  },
  {
    id: 'shop',
    icon: 'cart',
    tint: '#22B573',
    gradient: ['#4FCB8F', '#137A4C'],
  },
  {
    id: 'taxi',
    icon: 'car',
    tint: '#F5A524',
    gradient: ['#FBC658', '#C77A0B'],
  },
  {
    id: 'work',
    icon: 'briefcase',
    tint: '#5A8DEE',
    gradient: ['#7FA8F5', '#2F5FC4'],
  },
  {
    id: 'airport',
    icon: 'airplane',
    tint: '#17B2D6',
    gradient: ['#5CC3F2', '#0A6796'],
  },
];

export const SCENARIO_MAP: Readonly<Record<ScenarioId, Scenario>> = Object.fromEntries(
  SCENARIOS.map((scenario) => [scenario.id, scenario]),
) as Record<ScenarioId, Scenario>;

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in SCENARIO_MAP;
}
