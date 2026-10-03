import { Tabs } from 'expo-router';

import { FloatingTabBar, type TabIconMap } from '@/components/navigation/FloatingTabBar';
import { useT, type TranslationKey } from '@/i18n';

const TABS: readonly { name: string; title: TranslationKey; icons: TabIconMap[string] }[] = [
  { name: 'home', title: 'tab.home', icons: { idle: 'home-outline', active: 'home' } },
  {
    name: 'conversations',
    title: 'tab.conversations',
    icons: { idle: 'chatbubbles-outline', active: 'chatbubbles' },
  },
  { name: 'translate', title: 'tab.translate', icons: { idle: 'language-outline', active: 'language' } },
  { name: 'profile', title: 'tab.profile', icons: { idle: 'person-circle-outline', active: 'person-circle' } },
];

const ICONS: TabIconMap = Object.fromEntries(TABS.map(({ name, icons }) => [name, icons]));

export default function TabsLayout() {
  const t = useT();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} icons={ICONS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      {TABS.map(({ name, title }) => (
        <Tabs.Screen key={name} name={name} options={{ title: t(title) }} />
      ))}
    </Tabs>
  );
}
