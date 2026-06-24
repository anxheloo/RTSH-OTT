/**
 * Authenticated app layout — wraps tabs + full-screen player modals.
 * System header is hidden; player modals are presented as full-screen sheets.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Stack } from 'expo-router';

import { useAdQuery, useChannelsQuery, useMeQuery } from '@/api/queries';
import RadioMiniPlayer from '@/components/Layout/RadioMiniPlayer';
import AdOverlay from '@/components/Media/AdOverlay';
import RadioAudioHost from '@/components/Media/RadioAudioHost';
import { getModalScreenOptions } from '@/utils/navigation';

const AppLayout: React.FC = () => {
  useMeQuery();

  const [launchAdDismissed, setLaunchAdDismissed] = useState(false);
  // Defer the launch-ad fetch until Home's TV channels have settled, so the ad
  // never pops over a skeleton/empty first screen. Shared query key — no extra
  // fetch (TanStack dedupes with Home's `useChannelsQuery('tv')`).
  const { isLoading: homeLoading } = useChannelsQuery('tv');
  const { creative: launchAd } = useAdQuery(
    { placement: 'APP_OPEN' },
    { enabled: !homeLoading },
  );

  return (
    <View style={styles.root}>
      {/* Pushed screens slide in from the right (matches the auth stack);
          full-screen player modals slide up from the bottom — modal semantics,
          and the gesture/back direction reads correctly on both platforms. */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="channel/[id]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="settings" />
        <Stack.Screen name="account" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="player-options" options={getModalScreenOptions()} />
        <Stack.Screen name="quality" options={getModalScreenOptions()} />
        <Stack.Screen name="language" options={getModalScreenOptions()} />
        <Stack.Screen name="theme" options={getModalScreenOptions()} />
      </Stack>
      <RadioAudioHost />
      <RadioMiniPlayer />
      {launchAd && !launchAdDismissed && (
        <AdOverlay creative={launchAd} onComplete={() => setLaunchAdDismissed(true)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default AppLayout;
