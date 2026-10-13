import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useApp } from '../../state/AppState';

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const { prefs, colors, t } = useApp();
  if (!prefs.onboarded) return <Redirect href="/onboarding" />;

  const icon = (active: IconName, inactive: IconName) =>
    function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
      return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.summary'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="feed" options={{ title: t('tab.feed'), tabBarIcon: icon('newspaper', 'newspaper-outline') }} />
      <Tabs.Screen name="watchlist" options={{ title: t('tab.watchlist'), tabBarIcon: icon('star', 'star-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('tab.profile'), tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
