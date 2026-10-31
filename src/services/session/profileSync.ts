import { isScenarioId } from '@/mocks/scenarios';
import { endpoints, type ApiHistoryItem, type ApiUser } from '@/services/api/endpoints';
import { isApiConfigured } from '@/services/api/config';
import { getToken } from '@/services/api/tokenStore';
import { isStudyLanguage, type StudyLanguage } from '@/services/learning';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore, type OnboardingData } from '@/store/userStore';
import { useVocabularyStore } from '@/features/vocabulary/vocabularyStore';
import type { HistoryEntry, LearnerExperience, LearningFocus, LearningGoal, UserProfile } from '@/types';

import { syncVocabulary } from './vocabularySync';

const GOALS: readonly LearningGoal[] = ['travel', 'work', 'study', 'relocation', 'family', 'fun'];
const FOCUS: readonly LearningFocus[] = ['speaking', 'listening', 'vocabulary', 'grammar', 'pronunciation', 'confidence'];
const EXPERIENCES: readonly LearnerExperience[] = ['none', 'school', 'self_taught', 'courses', 'immersion'];

/** Keeps only values this build knows, so a newer server cannot put unknown options on screen. */
const known = <T extends string>(allowed: readonly T[], values: readonly string[] = []): T[] =>
  values.filter((value): value is T => allowed.includes(value as T));

const toHistory = (item: ApiHistoryItem): HistoryEntry[] =>
  item.state === 'finished' && isScenarioId(item.scenario_id)
    ? [{ id: `${item.id}`, scenarioId: item.scenario_id, durationSec: item.duration_sec ?? 0, score: item.score ?? 0, date: Date.parse(item.started_at) }]
    : [];

function applyUser(user: ApiUser): void {
  const settings = useSettingsStore.getState();
  if (isStudyLanguage(user.target_language) && user.target_language !== settings.studyLanguage) settings.setStudyLanguage(user.target_language);
  useUserStore.getState().hydrate({
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
    avatarCustom: user.avatar_custom,
    gender: user.gender ?? null,
    country: user.country,
    birthDate: user.birth_date,
    level: user.level,
    levelSource: user.level_source ?? null,
    placementScore: user.placement_score ?? null,
    experience: known(EXPERIENCES, user.experience ? [user.experience] : [])[0] ?? null,
    goals: known(GOALS, user.goals),
    focus: known(FOCUS, user.focus),
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

/** Pull-to-refresh: reloads the profile, progress, history and word list. Quiet when offline or signed out. */
export async function refreshFromServer(): Promise<void> {
  if (!(await signedIn())) return;
  try {
    await hydrateFromServer(await endpoints.me());
    await syncVocabulary();
  } catch {
    // Offline: the screens keep showing what is stored on the device.
  }
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
      level_source: data.levelSource,
      // The server only accepts a score alongside a placement result.
      ...(data.levelSource === 'placement' ? { placement_score: data.placementScore } : {}),
      experience: data.experience,
      goals: data.goals,
      focus: data.focus,
      daily_goal_minutes: data.dailyGoalMinutes,
      ui_language: useSettingsStore.getState().language,
      target_language: data.studyLanguage,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    .catch(() => undefined);
}

export type ProfileEdits = Pick<UserProfile, 'name' | 'gender' | 'country' | 'birthDate' | 'level' | 'goals' | 'dailyGoalMinutes'> & {
  studyLanguage: StudyLanguage;
};

/** Saves edits from the profile screen. Unlike the background syncs it throws, so the screen can say it failed. */
export async function saveProfile({ studyLanguage, ...edits }: ProfileEdits): Promise<void> {
  if (!(await signedIn())) {
    useUserStore.getState().hydrate(edits);
    useSettingsStore.getState().setStudyLanguage(studyLanguage);
    return;
  }
  applyUser(
    await endpoints.updateMe({
      name: edits.name,
      gender: edits.gender === 'unspecified' ? null : edits.gender,
      country: edits.country,
      birth_date: edits.birthDate,
      level: edits.level,
      goals: edits.goals,
      daily_goal_minutes: edits.dailyGoalMinutes,
      target_language: studyLanguage,
    }),
  );
  // Servers that predate English answer without the field; the choice still applies on this device.
  useSettingsStore.getState().setStudyLanguage(studyLanguage);
}

/** Uploads a prepared JPEG as the profile photo, or removes the uploaded one when `uri` is null. Throws on failure. */
export async function saveAvatar(uri: string | null): Promise<void> {
  if (!(await signedIn())) {
    useUserStore.getState().hydrate({ avatarUrl: uri, avatarCustom: uri !== null });
    return;
  }
  if (uri === null) {
    applyUser(await endpoints.deleteAvatar());
    return;
  }
  const form = new FormData();
  // React Native's FormData sends a local file given as { uri, name, type }.
  form.append('photo', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
  applyUser(await endpoints.uploadAvatar(form));
}

/** The tutor writes its explanations in this language, so a change in settings has to reach the server. */
export async function pushLanguage(language: 'uz' | 'ru' | 'en'): Promise<void> {
  if (!(await signedIn())) return;
  await endpoints.updateMe({ ui_language: language }).catch(() => undefined);
}
