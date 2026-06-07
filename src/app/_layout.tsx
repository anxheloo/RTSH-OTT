import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useAppStore } from '@/store/useAppStore';
import { queryClient } from '@/api/client';
import { useBootstrap } from '@/hooks/useBootstrap';
import { BrandedSplash } from '@/components/Brand';
import { TCGateOverlay } from '@/components/Layout';
import ModalWrapper from '@/components/ModalWrapper';

// Start mock server before any React rendering so the first API call is intercepted.
// Tree-shaken in production — the conditional is evaluated at module load time.
if (process.env.EXPO_PUBLIC_API_MODE === 'mock') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/api/mocks/server').initMockServer();
}

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { isReady } = useBootstrap();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  // Inter is the design's sole family (Phase 22.2). Keys are the family names the
  // `Fonts` tokens in theme/fonts.ts alias to.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    // Our branded splash takes over from the native splash as soon as React can
    // paint, so hide the native splash on first mount (after the first frame).
    SplashScreen.hideAsync();
  }, []);

  if ((!fontsLoaded && !fontError) || !isReady) {
    return <BrandedSplash />;
  }

  return (
    <>
      {/*
        Gate on `isAuthenticated` ONLY — never on `token`. The access token is
        in-memory and null on every cold boot until the background refresh
        lands; gating on it would route a logged-in user (esp. offline) back to
        (auth). The interceptor lazily refreshes the access token on the first
        401 once inside the app.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
      <ModalWrapper />
      <TCGateOverlay />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <RootLayoutInner />
        </KeyboardProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
