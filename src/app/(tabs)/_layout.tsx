import { Tabs } from 'expo-router';

import { FloatingTabBar, type TabIconMap } from '@/components/navigation/FloatingTabBar';
import { useT, type TranslationKey } from '@/i18n';

const TABS: readonly { name: string; title: TranslationKey; icon: TabIconMap[string] }[] = [
  { name: 'home', title: 'tab.home', icon: 'home' },
  { name: 'conversations', title: 'tab.conversations', icon: 'chatbubbles' },
  { name: 'words', title: 'tab.words', icon: 'book' },
  { name: 'translate', title: 'tab.translate', icon: 'language' },
  { name: 'profile', title: 'tab.profile', icon: 'person-circle' },
];

const ICONS: TabIconMap = Object.fromEntries(TABS.map(({ name, icon }) => [name, icon]));

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
