/**
 * Authenticated app layout — wraps tabs + full-screen player modals.
 * System header is hidden; player modals are presented as full-screen sheets.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Stack } from 'expo-router';

import { useAdsQuery, useChannelsQuery, useMeQuery } from '@/api/queries';
import { useDelayedReveal, useDeviceIdentity, useRealtimeConnection } from '@/hooks';
import RadioMiniPlayer from '@/components/Layout/RadioMiniPlayer';
import AdOverlay from '@/components/Media/AdOverlay';
import RadioAudioHost from '@/components/Media/RadioAudioHost';
import { getModalScreenOptions } from '@/utils/navigation';
import { AD_REVEAL_DELAY_MS } from '@/constants/ads';
// Analytics disabled for now — re-enable when telemetry is wanted.
// import { useAnalytics } from '@/analytics';

const AppLayout: React.FC = () => {
  useMeQuery();
  // Register this device once per authenticated entry (fires regardless of which
  // route the user lands on — covers deep links into a non-Home tab).
  useDeviceIdentity();
  // Open the app-level STOMP connection (= presence) while authenticated.
  useRealtimeConnection();
  // Telemetry lifecycle: app_open + session + heartbeat (single entry point).
  // useAnalytics();

  const [launchAdDismissed, setLaunchAdDismissed] = useState(false);
  // Defer the launch-ad fetch until Home's TV channels have settled, so the ad
  // never pops over a skeleton/empty first screen. Shared query key — no extra
  // fetch (TanStack dedupes with Home's `useChannelsQuery('tv')`).
  const { isLoading: homeLoading } = useChannelsQuery('tv');
  const { ads: appOpenAds } = useAdsQuery(undefined, { enabled: !homeLoading });
  const launchAd = appOpenAds.find((a) => a.placement === 'APP_OPEN') ?? null;
  // Ease the ad in a couple seconds after the app has rendered, not the instant
  // it's fetched — never a hard snap over a freshly-drawn screen.
  const showLaunchAd = useDelayedReveal(!!launchAd && !launchAdDismissed, AD_REVEAL_DELAY_MS);

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
      {launchAd && showLaunchAd && !launchAdDismissed && (
        <AdOverlay
          creative={launchAd}
          placement="APP_OPEN"
          onComplete={() => setLaunchAdDismissed(true)}
        />
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
