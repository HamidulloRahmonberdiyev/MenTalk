import { router } from 'expo-router';
import { useEffect } from 'react';

import { onReminderRoute, takeReminderRoute } from './scheduler';

/** Opens the screen a tapped reminder points at. Mounted on the home screen, behind sign-in. */
export function useReminderRoute(): void {
  useEffect(() => {
    const open = () => {
      const route = takeReminderRoute();
      if (route) router.navigate(route);
    };
    open();
    return onReminderRoute(open);
  }, []);
}
