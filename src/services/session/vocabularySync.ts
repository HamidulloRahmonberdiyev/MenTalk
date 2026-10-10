import { useVocabularyStore } from '@/features/vocabulary/vocabularyStore';
import { isApiConfigured } from '@/services/api/config';
import { endpoints, type ApiCard } from '@/services/api/endpoints';
import { getToken } from '@/services/api/tokenStore';
import type { VocabCard } from '@/types';

const MAX_CHANGES = 500;
const DEBOUNCE_MS = 3000;

export interface ReviewAnswer {
  word: string;
  correct: boolean;
  answeredAt: number;
}

const iso = (time: number) => new Date(time).toISOString();

function toApi(card: VocabCard): ApiCard {
  const updated = card.updatedAt ?? card.addedAt;
  return {
    word: card.id,
    translation: card.translation,
    example: card.example ?? null,
    form: card.form ?? null,
    stage: card.stage,
    streak: card.streak,
    lapses: card.lapses,
    due_at: iso(card.due),
    updated_at: iso(updated),
    deleted: false,
  };
}

function tombstone(id: string, time: number): ApiCard {
  return { word: id, translation: id, example: null, form: null, stage: 0, streak: 0, lapses: 0, due_at: iso(time), updated_at: iso(time), deleted: true };
}

function fromApi(card: ApiCard): VocabCard {
  const updatedAt = Date.parse(card.updated_at);
  return {
    id: card.word,
    word: card.word,
    translation: card.translation,
    example: card.example ?? undefined,
    form: card.form ?? undefined,
    stage: card.stage,
    streak: card.streak,
    lapses: card.lapses,
    due: Date.parse(card.due_at),
    addedAt: updatedAt,
    updatedAt,
  };
}

let running: Promise<void> | null = null;
let rerun = false;
let timer: ReturnType<typeof setTimeout> | null = null;

async function pass(): Promise<void> {
  const startedAt = Date.now();
  const { cards, removed, cursor, pushedAt } = useVocabularyStore.getState();
  const changes = [
    ...cards.filter((card) => (card.updatedAt ?? card.addedAt) > pushedAt).map(toApi),
    ...Object.entries(removed).filter(([, time]) => time > pushedAt).map(([id, time]) => tombstone(id, time)),
  ].slice(0, MAX_CHANGES);

  const response = await endpoints.syncCards(cursor, changes);
  const live = response.cards.filter((card) => !card.deleted).map(fromApi);
  const deleted = response.cards.filter((card) => card.deleted).map((card) => card.word);
  useVocabularyStore.getState().applyRemote(live, deleted, { cursor: response.cursor, pushedAt: changes.length === MAX_CHANGES ? pushedAt : startedAt });
}

/** Two-way sync of the word list. Calls made while one is running are folded into a single follow-up. */
export function syncVocabulary(): Promise<void> {
  if (!isApiConfigured) return Promise.resolve();
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    if (!(await getToken())) return;
    do {
      rerun = false;
      await pass();
    } while (rerun);
  })()
    .catch(() => undefined)
    .finally(() => {
      running = null;
    });
  return running;
}

function hasPendingChanges(): boolean {
  const { cards, removed, pushedAt } = useVocabularyStore.getState();
  return cards.some((card) => (card.updatedAt ?? card.addedAt) > pushedAt) || Object.values(removed).some((time) => time > pushedAt);
}

/** Syncs shortly after the last change, so a burst of edits makes one request. Merging the server's answer is not a change. */
export function scheduleVocabularySync(): void {
  if (!isApiConfigured || !hasPendingChanges()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncVocabulary(), DEBOUNCE_MS);
}

/**
 * Sends a finished round to the server, which advances the schedules and returns the XP total;
 * then syncs so this device picks up the server's schedule for those words.
 */
export async function submitReviews(answers: ReviewAnswer[]): Promise<void> {
  if (!isApiConfigured || answers.length === 0 || !(await getToken())) return;
  try {
    const { xp } = await endpoints.reviewCards(
      answers.slice(0, 30).map((answer) => ({ word: answer.word, correct: answer.correct, answered_at: iso(answer.answeredAt) })),
    );
    useVocabularyStore.getState().setXp(xp);
  } catch {
    // Offline: the local schedule is pushed by the next sync instead.
  }
  await syncVocabulary();
}
