import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints, type ApiNotebookMistake, type ApiMistakeAnswer } from '@/services/api/endpoints';
import type { StudyLanguage } from '@/services/learning';

import { PERFECT_BONUS, xpForAnswer } from '../vocabulary/progress';
import { useVocabularyStore, visibleStreak } from '../vocabulary/vocabularyStore';
import { buildRound, drillFor, isRight, retryKind, type Drill } from './drills';
import { flushMistakeAnswers, refreshMistakeSummary, useMistakesStore } from './mistakesStore';

const ROUND_SIZE = 10;

export interface DrillAnswer {
  given: string;
  correct: boolean;
}

export interface DrillSummary {
  correct: number;
  total: number;
  xp: number;
  bonus: number;
  streak: number;
}

type Load = { state: 'loading' } | { state: 'failed' } | { state: 'empty' } | { state: 'ready' };

/**
 * One drill round over the learner's own mistakes. As in the word game, only a mistake's first
 * answer counts for its schedule, the XP and the accuracy; a miss comes back once at the end in
 * another form. Answers are queued on the device first, so a round finished offline is not lost.
 */
export function useMistakeDrill(language: StudyLanguage) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [queue, setQueue] = useState<Drill[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<DrillAnswer | null>(null);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [summary, setSummary] = useState<DrillSummary | null>(null);
  const answered = useRef(new Set<string>());
  const answers = useRef<ApiMistakeAnswer[]>([]);
  const shownAt = useRef<number | null>(null);
  const finishRound = useVocabularyStore((state) => state.finishRound);

  useEffect(() => {
    let current = true;
    endpoints.mistakePractice(language, ROUND_SIZE).then(
      (mistakes: ApiNotebookMistake[]) => {
        if (!current) return;
        setQueue(buildRound(mistakes));
        setLoad({ state: mistakes.length ? 'ready' : 'empty' });
      },
      () => current && setLoad({ state: 'failed' }),
    );
    return () => {
      current = false;
    };
  }, [language, attempt]);

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index, queue]);

  const retry = useCallback(() => {
    setLoad({ state: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  const drill: Drill | undefined = queue[index];
  const total = new Set(queue.map((item) => item.mistake.id)).size;

  const submit = useCallback(
    (given: string) => {
      if (!drill || answer) return;
      const correct = isRight(drill, given);
      setAnswer({ given, correct });

      const first = !answered.current.has(drill.mistake.id);
      answered.current.add(drill.mistake.id);
      if (first) {
        const answeredAt = Date.now();
        answers.current.push({
          id: drill.mistake.id,
          correct,
          exercise: drill.kind,
          answered_at: new Date(answeredAt).toISOString(),
          duration_ms: shownAt.current === null ? null : answeredAt - shownAt.current,
        });
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
      if (first) setQueue((items) => [...items, drillFor(drill.mistake, retryKind(drill.kind, drill.mistake), Math.random, ':again')]);
    },
    [drill, answer, combo],
  );

  const next = useCallback(() => {
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      setAnswer(null);
      return;
    }
    const bonus = correctCount === total ? PERFECT_BONUS : 0;
    finishRound(xp + bonus);
    useMistakesStore.getState().enqueue(answers.current);
    // The counts on the notebook and home card follow once the server has the answers.
    void flushMistakeAnswers().then(() => refreshMistakeSummary(language));
    setSummary({ correct: correctCount, total, xp: xp + bonus, bonus, streak: visibleStreak(useVocabularyStore.getState()) });
  }, [index, queue.length, correctCount, total, xp, finishRound, language]);

  return {
    load,
    retry,
    drill,
    index,
    answer,
    combo,
    summary,
    progress: queue.length === 0 ? 0 : (index + (answer ? 1 : 0)) / queue.length,
    submit,
    next,
  };
}
