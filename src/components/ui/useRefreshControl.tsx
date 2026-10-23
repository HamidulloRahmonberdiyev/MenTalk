import { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/services/haptics';
import { refreshFromServer } from '@/services/session';
import { colors } from '@/theme';

/** Keeps the spinner up long enough to read as a refresh even when the server answers instantly. */
const MIN_SPIN_MS = 500;

/**
 * Pull-to-refresh for a scroll view: reloads the signed-in person's data, then bumps `version` so the
 * screen can remount its content (`key={version}`) and render fresh.
 *
 *   const { refreshControl, version } = useRefreshControl();
 *   <ScrollView refreshControl={refreshControl}><Fragment key={version}>…</Fragment></ScrollView>
 */
export function useRefreshControl(onRefresh: () => Promise<void> = refreshFromServer) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    haptics.light();
    setRefreshing(true);
    await Promise.all([onRefresh().catch(() => undefined), new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS))]);
    setVersion((value) => value + 1);
    setRefreshing(false);
  }, [onRefresh]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      // Android draws the spinner over the content; keep it below the status bar.
      progressViewOffset={insets.top}
    />
  );

  return { refreshControl, version };
}
