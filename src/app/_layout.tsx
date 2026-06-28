import { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useAppStore } from '@/store/useAppStore';
import { setupAuthRefresh } from '@/api';
import { queryClient } from '@/api/client';
import { setupFocusManager } from '@/api/focusManager';
import { useNetworkMonitor, useOTA } from '@/hooks';
import { useCheckToken } from '@/hooks/useCheckToken';
import { useSystemTheme } from '@/hooks/useSystemTheme';
import { ToastHost } from '@/components/Layout';
import ModalWrapper from '@/components/ModalWrapper';
import { initI18n } from '@/i18n';

import '@/polyfills'; // installs TextEncoder/TextDecoder fallback (STOMP) at boot, before any runtime use

// Start mock server before any React rendering so the first API call is intercepted.
// Tree-shaken in production — the conditional is evaluated at module load time.
if (process.env.EXPO_PUBLIC_API_MODE === 'mock') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/api/mocks/server').initMockServer();
}

SplashScreen.preventAutoHideAsync();

// TODO(anx 2026-06-25): TEMP boot diagnostics — remove after first-launch splash hang is found.
console.log('[BOOT] _layout: module scope start');

// One-time, app-session-wide wiring. At module scope (not in render) so it runs
// exactly once: 401 → refresh on the api client, AppState → TanStack focus
// bridge, and i18n init before the first screen renders. All three are
// internally idempotent, but keeping them here avoids re-running on every render.
try {
  console.log('[BOOT] _layout: setupAuthRefresh…');
  setupAuthRefresh();
  console.log('[BOOT] _layout: setupFocusManager…');
  setupFocusManager();
  console.log('[BOOT] _layout: initI18n…');
  initI18n();
  console.log('[BOOT] _layout: module wiring done OK');
} catch (e) {
  console.log('[BOOT] _layout: module wiring THREW', e);
}

const RootLayoutNav = () => {
  const colors = useAppStore((s) => s.colors);
  const mode = useAppStore((s) => s.mode);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });
  // TODO(anx 2026-06-25): TEMP boot diagnostics — remove after first-launch splash hang is found.
  if (fontError) console.log('[BOOT] _layout: useFonts ERROR', fontError);
  const { tokenChecked } = useCheckToken();
  useNetworkMonitor();
  useSystemTheme();

  useEffect(() => {
    StatusBar.setBarStyle(mode === 'dark' ? 'light-content' : 'dark-content');
  }, [mode]);

  // TODO(anx 2026-06-25): TEMP boot diagnostics — remove after first-launch splash hang is found.
  console.log(
    '[BOOT] RootLayoutNav render — fontsLoaded:',
    fontsLoaded,
    'tokenChecked:',
    tokenChecked,
  );

  useEffect(() => {
    if (fontsLoaded && tokenChecked) {
      console.log('[BOOT] _layout: both gates true → SplashScreen.hideAsync()');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, tokenChecked]);

  useOTA();

  if (!fontsLoaded || !tokenChecked) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <NavigationBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
      <ModalWrapper />
      <ToastHost />
    </View>
  );
};

/** Root layout — all wrappers / providers live here. No hooks. */
const RootLayout = () => (
  <GestureHandlerRootView style={styles.root}>
    <QueryClientProvider client={queryClient}>
      <KeyboardProvider>
        <RootLayoutNav />
      </KeyboardProvider>
    </QueryClientProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default RootLayout;
