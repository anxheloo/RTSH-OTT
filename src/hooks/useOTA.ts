import { useEffect, useState } from 'react';

import NetInfo from '@react-native-community/netinfo';
import * as Updates from 'expo-updates';

/**
 * Applies a published OTA update silently at startup, while the native splash
 * is still up — no prompt. Returns `ready`, which the root layout adds to its
 * splash gate.
 *
 * - Online + the update downloads within `UPDATE_WAIT_MS` → reload into it
 *   behind a brand-black reload screen, so the user only ever sees the new JS.
 * - Offline, slower than that, or any error → boot the current bundle now. A
 *   download already under way still finishes and applies on the next cold
 *   start (expo-updates' own launch behaviour); it is never applied mid-session.
 *
 * **Why a deadline at all**, when an update is ~1-2 MB and lands in about a
 * second: a network that is *connected but not working* (captive portal, dead
 * cell, unreachable origin) does not fail, it hangs — and `NetInfo` reports it
 * as connected. The native download timeouts are the only other floor, and they
 * are 60s per request on iOS (`FileDownloader.DefaultTimeoutInterval`) against
 * 10s on Android (`FileDownloader.kt`, `max(launchWaitMs, 10_000)`), i.e. up to
 * ~2 minutes of splash across the check + fetch pair. The deadline bounds that;
 * on a working network it never binds.
 *
 * The native startup check (`checkAutomatically: ON_LOAD`, the default) runs
 * first: expo-updates queues these calls behind it, so a download it already
 * started is reused, not repeated.
 *
 * Always on a bad update: publish with `--rollout-percentage` and revert with
 * `eas update:revert-update-rollout`, since nobody gets to decline it any more.
 */
const UPDATE_WAIT_MS = 10_000;

/**
 * Downloads a pending update and reloads into it. Resolves true only when a
 * reload was actually issued — `claimSplash` is what decides that, so the
 * caller owns the boot-vs-reload race rather than this function racing it.
 */
async function applyUpdateIfReady(claimSplash: () => boolean): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected === false) return false;

    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable && !check.isRollBackToEmbedded) return false;

    const fetched = await Updates.fetchUpdateAsync();
    if (!fetched.isNew && !fetched.isRollBackToEmbedded) return false;

    // Claim the splash BEFORE restarting. Past the deadline the app is already
    // on screen, and yanking it out from under the user is worse than waiting
    // for the next cold start — which applies this same downloaded update.
    if (!claimSplash()) return false;

    await Updates.reloadAsync({
      reloadScreenOptions: {
        backgroundColor: '#000000', // matches the native splash
        image: require('../../assets/images/splash-icon.png'),
      },
    });
    return true;
  } catch {
    // Best-effort — a failed check must never block boot. A throw AFTER the
    // claim (a rejected `reloadAsync`) returns false too, so the caller reopens
    // the gate instead of holding the splash forever.
    return false;
  }
}

export function useOTA(): boolean {
  // `isEnabled` is false in dev-client / debug builds, so dev never waits.
  const [ready, setReady] = useState(!Updates.isEnabled);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    // One-shot state machine. EVERY transition goes through `settle`, which is
    // also the only place the deadline is cleared — so the timer can never fire
    // after a reload is claimed, and a reload can never be claimed after boot.
    // Synchronous, single-threaded JS: no interleaving between the read and the
    // write below, so this is atomic without any further guarding.
    let phase: 'waiting' | 'booting' | 'reloading' = 'waiting';
    let deadline: ReturnType<typeof setTimeout> | undefined;

    const settle = (next: 'booting' | 'reloading'): boolean => {
      // `booting` is terminal: the app is interactive, nothing may reclaim it.
      if (phase === 'booting') return false;
      // …but `reloading` is NOT: a rejected `reloadAsync` falls back to booting.
      if (next === 'reloading' && phase !== 'waiting') return false;

      phase = next;
      clearTimeout(deadline);
      deadline = undefined;
      if (next === 'booting') setReady(true);
      return true;
    };

    deadline = setTimeout(() => settle('booting'), UPDATE_WAIT_MS);

    applyUpdateIfReady(() => settle('reloading')).then((reloading) => {
      // Not reloading — either nothing to apply, or the reload itself failed.
      if (!reloading) settle('booting');
    });

    return () => clearTimeout(deadline);
  }, []);

  return ready;
}
