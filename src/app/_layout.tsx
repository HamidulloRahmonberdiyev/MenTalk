import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { startReminders } from '@/features/reminders/scheduler';
import { startSession } from '@/services/session';
import { usePalette } from '@/theme/appearance';

export default function RootLayout() {
  const home = usePalette();
  useEffect(() => startSession(() => router.replace('/')), []);
  useEffect(startReminders, []);

  return (
    <>
      <StatusBar style={home.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: home.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="conversation/[scenarioId]" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="practice" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="mistakes-practice" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        {/* No swipe-back: unsaved edits are guarded by the screen's own discard sheet. */}
        <Stack.Screen name="profile-edit" options={{ gestureEnabled: false }} />
        <Stack.Screen name="face-lab" />
        {/* Camera-style screen: rises from the bottom, closed with its own button. */}
        <Stack.Screen name="scan" options={{ gestureEnabled: false, animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#0B0C10' } }} />
        <Stack.Screen name="result" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
