import { useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { Fonts } from '@/theme/fonts';
import { queryClient } from '@/api/client';
import { useBootstrap } from '@/hooks/useBootstrap';

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { isReady } = useBootstrap();

  const [loaded, error] = useFonts({
    [Fonts.light]: require('../../assets/fonts/Outfit-Light.ttf'),
    [Fonts.regular]: require('../../assets/fonts/Outfit-Regular.ttf'),
    [Fonts.medium]: require('../../assets/fonts/Outfit-Medium.ttf'),
    [Fonts.bold]: require('../../assets/fonts/Outfit-Bold.ttf'),
    [Fonts.semiBold]: require('../../assets/fonts/Outfit-SemiBold.ttf'),
    [Fonts.extraLight]: require('../../assets/fonts/Outfit-ExtraLight.ttf'),
    [Fonts.extraBold]: require('../../assets/fonts/Outfit-ExtraBold.ttf'),
    [Fonts.thin]: require('../../assets/fonts/Outfit-Thin.ttf'),
    [Fonts.black]: require('../../assets/fonts/Outfit-Black.ttf'),
  });

  const fontsResolved = loaded || !!error;

  useEffect(() => {
    if (fontsResolved && isReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsResolved, isReady]);

  if (!fontsResolved || !isReady) {
    return null;
  }

  return <Stack />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}
