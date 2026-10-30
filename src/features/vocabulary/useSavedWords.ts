import { useMemo } from 'react';

import { normalizeWord } from './words';
import { useStudyCards } from './vocabularyStore';

/** Normalized dictionary forms and text forms of every saved word, for tinting them in text. */
export function useSavedWords(): ReadonlySet<string> {
  const cards = useStudyCards();
  return useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      set.add(card.id);
      if (card.form) set.add(normalizeWord(card.form));
    }
    return set;
  }, [cards]);
}
