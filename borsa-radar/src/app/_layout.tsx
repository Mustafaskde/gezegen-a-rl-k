import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { dark } from '../lib/theme';
import { AppStateProvider, useApp } from '../state/AppState';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <RootStack />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { ready, colors } = useApp();
  // Kayıtlı tercihler yüklenene kadar boş ekran (splash yerine).
  if (!ready) return <View style={{ flex: 1, backgroundColor: dark.bg }} />;
  return (
    <>
      <StatusBar style={colors.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="disclosure/[id]" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
