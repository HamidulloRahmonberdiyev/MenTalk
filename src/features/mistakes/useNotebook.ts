import { useCallback, useEffect, useRef, useState } from 'react';

import { endpoints, type ApiNotebookMistake, type MistakeCategory } from '@/services/api/endpoints';
import type { StudyLanguage } from '@/services/learning';

import { refreshMistakeSummary } from './mistakesStore';

type Status = 'loading' | 'ready' | 'failed';

/** The notebook list for one language and category, a page at a time, with set-aside and undo. */
export function useNotebook(language: StudyLanguage, category: MistakeCategory | null) {
  const [items, setItems] = useState<ApiNotebookMistake[]>([]);
  /** Which list the items are of: another category shows a spinner, never the previous list. */
  const [shown, setShown] = useState<{ key: string; status: Exclude<Status, 'loading'> } | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  /** Only the latest request may write: switching category quickly must not show the old list. */
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    endpoints.mistakes(language, { category: category ?? undefined }).then(
      (page) => {
        if (current !== generation.current) return;
        setItems(page.data);
        setCursor(page.meta.next_cursor);
        setShown({ key: `${language}|${category ?? ''}|${attempt}`, status: 'ready' });
      },
      () => current === generation.current && setShown({ key: `${language}|${category ?? ''}|${attempt}`, status: 'failed' }),
    );
  }, [language, category, attempt]);

  const reload = useCallback(async () => {
    setAttempt((value) => value + 1);
    await refreshMistakeSummary(language);
  }, [language]);

  const retry = useCallback(() => {
    setShown(null);
    setAttempt((value) => value + 1);
  }, []);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    const current = generation.current;
    setLoadingMore(true);
    endpoints
      .mistakes(language, { category: category ?? undefined, cursor })
      .then((page) => {
        if (current !== generation.current) return;
        setItems((value) => {
          const known = new Set(value.map((item) => item.id));
          return [...value, ...page.data.filter((item) => !known.has(item.id))];
        });
        setCursor(page.meta.next_cursor);
      })
      .catch(() => undefined)
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, language, category]);

  /** Optimistic: gone at once, put back if the server says no. */
  const dismiss = useCallback(
    async (mistake: ApiNotebookMistake) => {
      const position = items.findIndex((item) => item.id === mistake.id);
      setItems((value) => value.filter((item) => item.id !== mistake.id));
      try {
        await endpoints.dismissMistake(mistake.id);
        void refreshMistakeSummary(language);
        return true;
      } catch {
        setItems((value) => insertAt(value, mistake, position));
        return false;
      }
    },
    [items, language],
  );

  const restore = useCallback(
    async (mistake: ApiNotebookMistake, position: number) => {
      setItems((value) => insertAt(value, mistake, position));
      try {
        await endpoints.restoreMistake(mistake.id);
        void refreshMistakeSummary(language);
      } catch {
        setItems((value) => value.filter((item) => item.id !== mistake.id));
      }
    },
    [language],
  );

  // A pull-to-refresh keeps the list on screen while it reloads; a new category does not.
  const status: Status = shown === null || !shown.key.startsWith(`${language}|${category ?? ''}|`) ? 'loading' : shown.status;

  return { items, status, loadingMore, hasMore: cursor !== null, reload, retry, loadMore, dismiss, restore };
}

function insertAt(items: ApiNotebookMistake[], mistake: ApiNotebookMistake, position: number): ApiNotebookMistake[] {
  if (items.some((item) => item.id === mistake.id)) return items;
  const at = position < 0 ? 0 : Math.min(position, items.length);
  return [...items.slice(0, at), mistake, ...items.slice(at)];
}
