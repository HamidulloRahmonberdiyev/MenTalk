import { isApiConfigured } from '@/services/api/config';
import { endpoints } from '@/services/api/endpoints';
import { useScenariosStore } from '@/store/scenariosStore';

/** Pulls the conversation topics. Public, so it needs no sign-in. Quiet when offline. */
export async function syncScenarios(): Promise<void> {
  if (!isApiConfigured) return;
  try {
    const { scenarios } = await endpoints.bootstrap();
    if (Array.isArray(scenarios)) useScenariosStore.getState().replace(scenarios);
  } catch {
    // Offline or an older server: the app keeps the topics it already has.
  }
}
