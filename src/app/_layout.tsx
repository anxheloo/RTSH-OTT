// eslint-disable-next-line simple-import-sort/imports -- MUST stay first: installs TextEncoder/TextDecoder (STOMP) before any other module loads
import '@/polyfills';

import { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { type ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useAppStore } from '@/store/useAppStore';
import { setupAuthRefresh } from '@/api';
import { queryClient } from '@/api/client';
import { setupFocusManager } from '@/api/focusManager';
import { useNetworkMonitor, useOTA } from '@/hooks';
import { useCheckToken } from '@/hooks/useCheckToken';
import { useLockPortrait } from '@/hooks/useOrientation';
import { useSystemTheme } from '@/hooks/useSystemTheme';
import { ToastHost } from '@/components/Layout';
import ModalWrapper from '@/components/ModalWrapper';
import { initI18n } from '@/i18n';

// Start mock server before any React rendering so the first API call is intercepted.
// Tree-shaken in production — the conditional is evaluated at module load time.
if (process.env.EXPO_PUBLIC_API_MODE === 'mock') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/api/mocks/server').initMockServer();
}

SplashScreen.preventAutoHideAsync();

// One-time, app-session-wide wiring. At module scope (not in render) so it runs
// exactly once: 401 → refresh on the api client, AppState → TanStack focus
// bridge, and i18n init before the first screen renders. All three are
// internally idempotent, but keeping them here avoids re-running on every render.
// Guarded because a throw during first-run init on a fresh install (native
// module not ready yet) must not abort module evaluation and wedge boot — the
// app can still render and recover on the normal path.
try {
  setupAuthRefresh();
  setupFocusManager();
  initI18n();
} catch {
  // Swallow — first-run init race; see above.
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
  // Treat a font-load error as "settled" (fall back to system fonts) so a failed
  // font can never wedge the splash — the canonical Expo useFonts + SplashScreen
  // pattern. The boot gate below is fonts-settled AND token-checked.
  const fontsSettled = fontsLoaded || !!fontError;
  const { tokenChecked } = useCheckToken();
  useNetworkMonitor();
  useSystemTheme();
  useLockPortrait(); // Portrait-only app; only the player rotates to landscape (non-TV).

  useEffect(() => {
    StatusBar.setBarStyle(mode === 'dark' ? 'light-content' : 'dark-content');
  }, [mode]);

  useEffect(() => {
    if (fontsSettled && tokenChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsSettled, tokenChecked]);

  useOTA();

  if (!fontsSettled || !tokenChecked) return null;

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

/**
 * Root error boundary (expo-router convention: a named `ErrorBoundary` export
 * from a route file catches render errors in its subtree). Before this, any
 * render-time throw in a tab crashed the whole app with no UI.
 *
 * Deliberately DEPENDENCY-FREE — no theme store, no i18n, no shared primitives:
 * any of those could be the thing that crashed, and the error screen must never
 * throw itself. Static bilingual copy (sq-first, matching the app default) and
 * hardcoded brand-black/white stand in for the token system here only.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Diçka shkoi keq</Text>
      <Text style={styles.errorBody}>
        Ndodhi një gabim i papritur. Provo përsëri.{'\n'}
        Something unexpected went wrong. Please try again.
      </Text>
      {__DEV__ && <Text style={styles.errorDetail}>{error.message}</Text>}
      <TouchableOpacity
        style={styles.errorBtn}
        onPress={retry}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Provo përsëri / Try again"
        testID="root-error-retry"
      >
        <Text style={styles.errorBtnLabel}>Provo përsëri · Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

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
  // Error-boundary styles: static values on purpose (see ErrorBoundary JSDoc).
  errorRoot: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  errorBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorDetail: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'center',
  },
  errorBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  errorBtnLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RootLayout;
