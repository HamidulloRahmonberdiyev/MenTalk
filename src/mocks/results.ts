import type { ConversationResult, ScenarioId } from '@/types';

export function createMockResult(
  scenarioId: ScenarioId,
  durationSec: number,
): ConversationResult {
  return {
    scenarioId,
    overall: 8,
    durationSec,
    metrics: [
      { id: 'speech', score: 8, max: 10 },
      { id: 'vocabulary', score: 7, max: 10 },
      { id: 'grammar', score: 8, max: 10 },
    ],
    mistakes: [
      {
        id: 'past-tense',
        wrong: 'Я хожу в магазин вчера.',
        wrongMark: 'хожу',
        correct: 'Я ходил в магазин вчера.',
        correctMark: 'ходил',
        noteKey: 'note.past',
      },
      {
        id: 'age',
        wrong: 'Мне 25 лет назад.',
        wrongMark: 'назад',
        correct: 'Мне 25 лет.',
        correctMark: '25 лет',
        noteKey: 'note.present',
      },
    ],
  };
}
