/**
 * Authenticated app layout — wraps tabs + full-screen player modals.
 * System header is hidden; player modals are presented as full-screen sheets.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Stack, usePathname } from 'expo-router';

import { useAdsQuery, useChannelsQuery, useMeQuery } from '@/api/queries';
import { useAdSlot, useDelayedReveal, useRealtimeConnection } from '@/hooks';
import RadioMiniPlayer from '@/components/Layout/RadioMiniPlayer';
import AdOverlay from '@/components/Media/AdOverlay';
import RadioAudioHost from '@/components/Media/RadioAudioHost';
import { getModalScreenOptions } from '@/utils/navigation';
import { AD_REVEAL_DELAY_MS } from '@/constants/ads';

// The app-open ad greets a cold open — it must never trail the user once they've
// navigated past the tabs (into a channel, radio, settings, …). Group routes
// don't appear in the pathname, so the 4 tabs resolve to these bare paths.
const TAB_PATHS = ['/', '/guide', '/search', '/profile'];

const AppLayout: React.FC = () => {
  useMeQuery();
  // Device registration removed 2026-07-14 — the standalone `PUT
  // /users/me/device` upsert this hook fired is gone; the device now rides
  // the login/register-verify body instead (see `utils/device.ts` and
  // ARCHITECTURE.md → Device identity).
  // Open the app-level STOMP connection (= presence) while authenticated.
  useRealtimeConnection();
  // Analytics (src/analytics) is built but DISABLED pending backend ingestion —
  // wiring guide: ARCHITECTURE.md → Analytics & telemetry (mount useAnalytics here).

  const [launchAdDismissed, setLaunchAdDismissed] = useState(false);
  // Defer the launch-ad fetch until Home's TV channels have settled, so the ad
  // never pops over a skeleton/empty first screen. Shared query key — no extra
  // fetch (TanStack dedupes with Home's `useChannelsQuery('tv')`).
  const { isLoading: homeLoading } = useChannelsQuery('tv');
  const { ads: appOpenAds } = useAdsQuery(undefined, { enabled: !homeLoading });
  const launchAd = appOpenAds.find((a) => a.placement === 'APP_OPEN') ?? null;
  // Scoped to the tabs — a user who has already tapped into a channel/radio/
  // settings screen has moved past the cold-open moment this ad is for.
  const onTabsScreen = TAB_PATHS.includes(usePathname());
  // Ease the ad in a couple seconds after the app has rendered, not the instant
  // it's fetched — never a hard snap over a freshly-drawn screen. Gating the
  // reveal timer itself on `onTabsScreen` (not just the final render) means a
  // navigation mid-countdown cancels the reveal outright, not just its display.
  const showLaunchAd = useDelayedReveal(
    !!launchAd && !launchAdDismissed && onTabsScreen,
    AD_REVEAL_DELAY_MS,
  );
  // One ad on screen at a time, app-wide (mirrors `ModalSlice`) — guards the
  // screen-transition window where this overlay and the channel screen's own
  // preroll could both be mounted for a frame.
  const canShowLaunchAd = useAdSlot(
    !!launchAd && showLaunchAd && !launchAdDismissed && onTabsScreen,
    launchAd?.id,
  );

  return (
    <View style={styles.root}>
      {/* Pushed screens slide in from the right (matches the auth stack); the
          player slides up from the bottom, which reads as modal on both platforms.

          The player is a plain CARD push, NOT `presentation: 'fullScreenModal'`.
          `fullScreenModal` makes it a natively-presented view controller, and
          `ModalWrapper` (app root) presents its RN `<Modal>` from that same root
          controller — on iOS the two race, so any global modal opened while the
          player is on screen (the cellular gate, `noInternet`, `apiError`)
          flashes for ~1s, is orphaned, and leaves an invisible full-screen modal
          window swallowing every touch app-wide. A card push keeps the player in
          the root controller's own stack, so global modals present cleanly over
          it. Visually identical on iOS; `gestureEnabled: false` preserves
          `fullScreenModal`'s no-swipe-to-dismiss behavior. */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="channel/[id]"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
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
      {launchAd && canShowLaunchAd && (
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
