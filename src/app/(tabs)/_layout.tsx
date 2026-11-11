import { Tabs } from 'expo-router';

import { TabBar } from '@/components/layout/TabBar';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="voice" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
