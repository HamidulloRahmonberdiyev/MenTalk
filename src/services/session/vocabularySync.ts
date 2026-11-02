import { START_EASE } from '@/features/vocabulary/srs';
import { cardLanguage, useVocabularyStore, type RemovedWord } from '@/features/vocabulary/vocabularyStore';
import { isApiConfigured } from '@/services/api/config';
import { endpoints, type ApiUserWord, type ApiUserWordChange } from '@/services/api/endpoints';
import { getToken } from '@/services/api/tokenStore';
import { DEFAULT_STUDY_LANGUAGE, studyLanguageOfWord } from '@/services/learning';
import type { ReviewRating, VocabCard } from '@/types';

const MAX_CHANGES = 500;
const DEBOUNCE_MS = 3000;

export interface ReviewAnswer {
  word: string;
  rating: ReviewRating;
  answeredAt: number;
  /** From showing the exercise to answering it. */
  durationMs?: number;
}

const iso = (time: number) => new Date(time).toISOString();

function toApi(card: VocabCard): ApiUserWordChange {
  return {
    id: card.serverId ?? null,
    word: card.word,
    language: cardLanguage(card),
    translation: card.translation,
    translation_language: card.translationLanguage ?? null,
    form: card.form ?? null,
    context_sentence: card.example ?? null,
    source: card.source ?? 'manual',
    status: card.status,
    ease: card.ease,
    interval_days: card.intervalDays,
    repetitions: card.repetitions,
    lapses: card.lapses,
    due_at: iso(card.due),
    last_reviewed_at: card.lastReviewedAt ? iso(card.lastReviewedAt) : null,
    updated_at: iso(card.updatedAt ?? card.addedAt),
    deleted: false,
  };
}

/** A deleted word. Only the id (or the spelling and language) matters; the rest satisfies the format. */
function tombstone(id: string, removed: RemovedWord): ApiUserWordChange {
  const time = iso(removed.at);
  return {
    id: removed.serverId ?? null,
    word: id,
    language: removed.language,
    translation: null,
    translation_language: null,
    form: null,
    context_sentence: null,
    source: 'manual',
    status: 'new',
    ease: START_EASE,
    interval_days: 0,
    repetitions: 0,
    lapses: 0,
    due_at: time,
    last_reviewed_at: null,
    updated_at: time,
    deleted: true,
  };
}

function fromApi(word: ApiUserWord): VocabCard {
  const updatedAt = Date.parse(word.updated_at);
  return {
    id: word.word.trim().toLowerCase(),
    serverId: word.id,
    word: word.word,
    language: word.language ?? DEFAULT_STUDY_LANGUAGE,
    translation: word.translation ?? '',
    translationLanguage: word.translation_language ?? undefined,
    example: word.context_sentence ?? undefined,
    form: word.form ?? undefined,
    source: word.source,
    status: word.status,
    ease: word.ease,
    intervalDays: word.interval_days,
    repetitions: word.repetitions,
    lapses: word.lapses,
    due: Date.parse(word.due_at),
    lastReviewedAt: word.last_reviewed_at ? Date.parse(word.last_reviewed_at) : undefined,
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
    ...Object.entries(removed).filter(([, word]) => word.at > pushedAt).map(([id, word]) => tombstone(id, word)),
  ].slice(0, MAX_CHANGES);

  const response = await endpoints.syncWords(cursor, changes);
  const live = response.words.filter((word) => !word.deleted).map(fromApi);
  const deleted = response.words.filter((word) => word.deleted).map((word) => ({ id: word.word.trim().toLowerCase(), serverId: word.id }));
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
  return cards.some((card) => (card.updatedAt ?? card.addedAt) > pushedAt) || Object.values(removed).some((word) => word.at > pushedAt);
}

/** Syncs shortly after the last change, so a burst of edits makes one request. Merging the server's answer is not a change. */
export function scheduleVocabularySync(): void {
  if (!isApiConfigured || !hasPendingChanges()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncVocabulary(), DEBOUNCE_MS);
}

/**
 * Sends a finished round to the server, which logs it, advances the schedules and returns the XP;
 * then syncs so this device picks up the server's schedule for those words. A resent round is
 * recognised by the server and changes nothing.
 */
export async function submitReviews(answers: ReviewAnswer[]): Promise<void> {
  if (!isApiConfigured || answers.length === 0 || !(await getToken())) return;
  try {
    const cards = new Map(useVocabularyStore.getState().cards.map((card) => [card.id, card]));
    const { xp } = await endpoints.reviewWords(
      answers.slice(0, 30).map((answer) => {
        const card = cards.get(answer.word);
        return {
          id: card?.serverId ?? null,
          word: card?.word ?? answer.word,
          language: card ? cardLanguage(card) : (studyLanguageOfWord(answer.word) ?? DEFAULT_STUDY_LANGUAGE),
          rating: answer.rating,
          answered_at: iso(answer.answeredAt),
          duration_ms: answer.durationMs ?? null,
        };
      }),
    );
    useVocabularyStore.getState().setXp(xp);
  } catch {
    // Offline: the local schedule is pushed by the next sync instead.
  }
  await syncVocabulary();
}
