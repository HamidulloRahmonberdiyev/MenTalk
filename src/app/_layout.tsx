import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/theme';

export default function RootLayout() {
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
        <Stack.Screen name="result" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
