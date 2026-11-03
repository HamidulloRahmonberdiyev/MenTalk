import { isScenarioId } from '@/mocks/scenarios';
import { isApiConfigured } from '@/services/api/config';
import { endpoints } from '@/services/api/endpoints';
import { getToken } from '@/services/api/tokenStore';
import type { StudyLanguage } from '@/services/learning';
import { usePathStore, type LanguageProgress } from '@/store/pathStore';
import { useSettingsStore } from '@/store/settingsStore';

/** Pulls the learner's path progress in the studied language. Quiet when offline or signed out. */
export async function syncPath(language: StudyLanguage = useSettingsStore.getState().studyLanguage): Promise<void> {
  if (!isApiConfigured || (await getToken()) === null) return;
  try {
    const path = await endpoints.path(language);
    const stages: LanguageProgress = {};
    for (const stage of path.stages) {
      if (isScenarioId(stage.scenario_id) && stage.best_score !== null) {
        stages[stage.scenario_id] = { best: stage.best_score, attempts: stage.attempts };
      }
    }
    usePathStore.getState().hydrate(language, stages);
  } catch {
    // Offline or an older server: the path keeps what the device recorded.
  }
}
