import { useCallback, useRef, useState } from 'react';

import { submitReviews, type ReviewAnswer } from '@/services/session/vocabularySync';

import { buildRound, exerciseFor, isCorrect, type Exercise } from './exercises';
import { PERFECT_BONUS, xpForAnswer } from './progress';
import { useVocabularyStore, visibleStreak } from './vocabularyStore';

export interface Answer {
  given: string;
  correct: boolean;
}

export interface RoundSummary {
  correct: number;
  total: number;
  xp: number;
  bonus: number;
  streak: number;
}

/**
 * One round of the word game. Only a word's first answer counts for its schedule, its XP and the
 * accuracy: a missed word comes back once at the end of the round in a different format, as a
 * second chance to learn it, not to farm points.
 */
export function usePracticeSession() {
  const [queue, setQueue] = useState<Exercise[]>(() => buildRound(useVocabularyStore.getState().cards, Date.now()));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  const answered = useRef(new Set<string>());
  const answers = useRef<ReviewAnswer[]>([]);

  const reviewWord = useVocabularyStore((state) => state.reviewWord);
  const finishRound = useVocabularyStore((state) => state.finishRound);

  const exercise: Exercise | undefined = queue[index];
  const total = new Set(queue.map((item) => item.card.id)).size;

  const submit = useCallback(
    (given: string) => {
      if (!exercise || answer) return;
      const correct = isCorrect(exercise, given);
      setAnswer({ given, correct });

      const first = !answered.current.has(exercise.card.id);
      answered.current.add(exercise.card.id);
      if (first) {
        reviewWord(exercise.card.id, correct);
        answers.current.push({ word: exercise.card.id, correct, answeredAt: Date.now() });
      }

      if (correct) {
        if (first) {
          const next = combo + 1;
          setCombo(next);
          setXp((value) => value + xpForAnswer(next));
          setCorrectCount((value) => value + 1);
        }
        return;
      }

      setCombo(0);
      if (first) {
        // One more try at the end of the round, in a different format.
        const cards = useVocabularyStore.getState().cards;
        const card = cards.find((item) => item.id === exercise.card.id) ?? exercise.card;
        setQueue((items) => [...items, exerciseFor(card, cards, exercise.kind, Math.random)]);
      }
    },
    [exercise, answer, combo, reviewWord],
  );

  const next = useCallback(() => {
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      setAnswer(null);
      return;
    }
    const perfect = correctCount === total;
    const bonus = perfect ? PERFECT_BONUS : 0;
    finishRound(xp + bonus);
    void submitReviews(answers.current);
    setSummary({ correct: correctCount, total, xp: xp + bonus, bonus, streak: visibleStreak(useVocabularyStore.getState()) });
  }, [index, queue.length, correctCount, total, xp, finishRound]);

  return {
    exercise,
    index,
    answer,
    combo,
    summary,
    /** 0..1 share of the queue that is done. */
    progress: queue.length === 0 ? 0 : (index + (answer ? 1 : 0)) / queue.length,
    submit,
    next,
  };
}
