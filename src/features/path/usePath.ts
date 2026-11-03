import { useMemo } from 'react';

import { usePathStore } from '@/store/pathStore';
import { useSettingsStore } from '@/store/settingsStore';

import { buildPath, type PathStage } from './path';

/** The stages of the path in the language being studied. */
export function usePath(): PathStage[] {
  const language = useSettingsStore((state) => state.studyLanguage);
  const progress = usePathStore((state) => state.progress[language]);
  return useMemo(() => buildPath(progress), [progress]);
}
