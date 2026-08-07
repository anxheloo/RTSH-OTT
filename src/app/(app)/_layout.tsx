/**
 * Authenticated app layout — wraps tabs + full-screen player modals.
 * System header is hidden; player modals are presented as full-screen sheets.
 */
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Stack, usePathname } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useAdsQuery, useChannelsQuery, useMeQuery } from '@/api/queries';
import { useAdSlot, useDelayedReveal, useRealtimeConnection } from '@/hooks';
import RadioMiniPlayer from '@/components/Layout/RadioMiniPlayer';
import AdOverlay from '@/components/Media/AdOverlay';
import RadioAudioHost from '@/components/Media/RadioAudioHost';
import { getModalScreenOptions, getPlayerScreenOptions } from '@/utils/navigation';
import { AD_REVEAL_DELAY_MS } from '@/constants/ads';

// The app-open ad greets a cold open — it must never trail the user once they've
// navigated past the tabs (into a channel, radio, settings, …). Group routes
// don't appear in the pathname, so the 4 tabs resolve to these bare paths.
const TAB_PATHS = ['/', '/guide', '/search', '/profile'];

const AppLayout: React.FC = () => {
  // Sheets paint their CONTAINER, not just their content — see
  // `getModalScreenOptions`'s `backgroundColor` note.
  const colors = useAppStore((s) => s.colors);
  const sheetOptions = getModalScreenOptions({ backgroundColor: colors.surface });
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
      {/* Pushed screens slide in from the right (matches the auth stack); both
          player routes slide up from the bottom and dismiss on a downward swipe,
          which reads as modal — while staying CARD PUSHES. That distinction is
          load-bearing, not cosmetic: see `getPlayerScreenOptions` for why a
          native presentation here strands an invisible touch-eating overlay. */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="channel/[id]" options={getPlayerScreenOptions()} />
        <Stack.Screen name="radio/[id]" options={getPlayerScreenOptions()} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="account" />
        <Stack.Screen name="change-password" />
        {/* `(modals)/` groups every route that presents as a native sheet, so a
            sheet is distinguishable from a push in the file tree alone. Typed
            routes require the group in the href (`/(app)/(modals)/language`) —
            it is part of the generated union, not elided. */}
        <Stack.Screen name="(modals)/player-options" options={sheetOptions} />
        <Stack.Screen name="(modals)/quality" options={sheetOptions} />
        <Stack.Screen name="(modals)/language" options={sheetOptions} />
        <Stack.Screen name="(modals)/theme" options={sheetOptions} />
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
