import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { startSession } from '@/services/session';
import { colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => startSession(() => router.replace('/')), []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="conversation/[scenarioId]" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="practice" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        {/* No swipe-back: unsaved edits are guarded by the screen's own discard sheet. */}
        <Stack.Screen name="profile-edit" options={{ gestureEnabled: false }} />
        <Stack.Screen name="face-lab" />
        <Stack.Screen name="result" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
