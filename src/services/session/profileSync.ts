import { isScenarioId } from '@/mocks/scenarios';
import { endpoints, type ApiHistoryItem, type ApiUser } from '@/services/api/endpoints';
import { isApiConfigured } from '@/services/api/config';
import { getToken } from '@/services/api/tokenStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore, type OnboardingData } from '@/store/userStore';
import { useVocabularyStore } from '@/features/vocabulary/vocabularyStore';
import type { HistoryEntry, LearningGoal } from '@/types';

import { syncVocabulary } from './vocabularySync';

const GOALS: readonly LearningGoal[] = ['travel', 'work', 'study', 'relocation', 'family', 'fun'];

const toHistory = (item: ApiHistoryItem): HistoryEntry[] =>
  item.state === 'finished' && isScenarioId(item.scenario_id)
    ? [{ id: `${item.id}`, scenarioId: item.scenario_id, durationSec: item.duration_sec ?? 0, score: item.score ?? 0, date: Date.parse(item.started_at) }]
    : [];

function applyUser(user: ApiUser): void {
  useUserStore.getState().hydrate({
    name: user.name,
    gender: user.gender ?? null,
    country: user.country,
    birthDate: user.birth_date,
    level: user.level,
    goals: user.goals.filter((goal): goal is LearningGoal => GOALS.includes(goal as LearningGoal)),
    dailyGoalMinutes: user.daily_goal_minutes,
    onboarded: user.level !== null,
  });
}

/**
 * Loads the signed-in person into the app: profile first (it decides the first screen), then
 * today's progress, finished chats and the word list, which only fill in screens already on show.
 */
export async function hydrateFromServer(user: ApiUser): Promise<void> {
  const settings = useSettingsStore.getState();
  if (user.ui_language && user.ui_language !== settings.language) settings.setLanguage(user.ui_language);
  applyUser(user);

  const [stats, history] = await Promise.allSettled([endpoints.stats(), endpoints.history()]);
  const profile = useUserStore.getState();
  if (stats.status === 'fulfilled') {
    profile.hydrate({ minutesToday: stats.value.today_minutes });
    useVocabularyStore.getState().setXp(stats.value.xp);
  }
  if (history.status === 'fulfilled') {
    const entries = history.value.flatMap(toHistory);
    profile.hydrate({ history: entries, lastScenarioId: entries[0]?.scenarioId ?? profile.lastScenarioId });
  }
  void syncVocabulary();
}

async function signedIn(): Promise<boolean> {
  return isApiConfigured && (await getToken()) !== null;
}

/** Saves the onboarding answers on the server. Failures are quiet: the local profile stays valid. */
export async function pushOnboarding(data: OnboardingData): Promise<void> {
  if (!(await signedIn())) return;
  await endpoints
    .updateMe({
      name: data.name,
      gender: data.gender === 'unspecified' ? null : data.gender,
      country: data.country,
      birth_date: data.birthDate,
      level: data.level,
      goals: data.goals,
      daily_goal_minutes: data.dailyGoalMinutes,
      ui_language: useSettingsStore.getState().language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    .catch(() => undefined);
}

/** The tutor writes its explanations in this language, so a change in settings has to reach the server. */
export async function pushLanguage(language: 'uz' | 'ru' | 'en'): Promise<void> {
  if (!(await signedIn())) return;
  await endpoints.updateMe({ ui_language: language }).catch(() => undefined);
}
