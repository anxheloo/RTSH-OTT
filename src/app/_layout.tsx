import { useEffect } from 'react';

import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { Fonts } from '@/theme/fonts';
import { useAppStore } from '@/store/useAppStore';
import { queryClient } from '@/api/client';
import { useBootstrap } from '@/hooks/useBootstrap';
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
  const token = useAppStore((s) => s.token);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const [fontsLoaded, fontError] = useFonts({
    [Fonts.light]: require('../../assets/fonts/Outfit-Light.ttf'),
    [Fonts.regular]: require('../../assets/fonts/Outfit-Regular.ttf'),
    [Fonts.medium]: require('../../assets/fonts/Outfit-Medium.ttf'),
    [Fonts.bold]: require('../../assets/fonts/Outfit-Bold.ttf'),
    [Fonts.semiBold]: require('../../assets/fonts/Outfit-SemiBold.ttf'),
    [Fonts.extraLight]: require('../../assets/fonts/Outfit-ExtraLight.ttf'),
    [Fonts.extraBold]: require('../../assets/fonts/Outfit-ExtraBold.ttf'),
    [Fonts.thin]: require('../../assets/fonts/Outfit-Thin.ttf'),
    [Fonts.black]: require('../../assets/fonts/Outfit-Black.ttf'),
    [Fonts.display]: Anton_400Regular,
    [Fonts.caption]: Inter_400Regular,
    [Fonts.captionMedium]: Inter_500Medium,
  });

  useEffect(() => {
    if ((fontsLoaded || !!fontError) && isReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isReady]);

  if ((!fontsLoaded && !fontError) || !isReady) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!isAuthenticated || !token}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated && !!token}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
      <ModalWrapper />
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}
