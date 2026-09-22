import { useEffect, useState } from 'react';

import NetInfo from '@react-native-community/netinfo';
import * as Updates from 'expo-updates';

/**
 * Applies a published OTA update silently at startup, while the native splash
 * is still up — no prompt. Returns `ready`, which the root layout adds to its
 * splash gate.
 *
 * - Online + an update downloads within `UPDATE_WAIT_MS` → reload into it
 *   behind a brand-black reload screen, so the user only ever sees the new JS.
 * - Slower than that, offline, or any error → boot the current bundle now. A
 *   download already under way still finishes and applies on the next cold
 *   start (expo-updates' own launch behaviour); it is never applied mid-session.
 *
 * The native startup check (`checkAutomatically: ON_LOAD`, the default) runs
 * first: expo-updates queues these calls behind it, so a download it already
 * started is reused, not repeated.
 *
 * Always on a bad update: publish with `--rollout-percentage` and revert with
 * `eas update:revert-update-rollout`, since nobody gets to decline it any more.
 */
const UPDATE_WAIT_MS = 5000;

/** Resolves true only when a reload into a new update has been issued. */
async function applyUpdateIfReady(isLate: () => boolean): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();
    if (net.isConnected === false) return false;

    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable && !check.isRollBackToEmbedded) return false;

    const fetched = await Updates.fetchUpdateAsync();
    if (!fetched.isNew && !fetched.isRollBackToEmbedded) return false;
    // Past the deadline the app is already on screen: leave it for the next launch.
    if (isLate()) return false;

    await Updates.reloadAsync({
      reloadScreenOptions: {
        backgroundColor: '#000000', // matches the native splash
        image: require('../../assets/images/splash-icon.png'),
      },
    });
    return true;
  } catch {
    // Best-effort — a failed check must never block boot.
    return false;
  }
}

export function useOTA(): boolean {
  // `isEnabled` is false in dev-client / debug builds, so dev never waits.
  const [ready, setReady] = useState(!Updates.isEnabled);

  useEffect(() => {
    if (!Updates.isEnabled) return;

    let released = false;
    const release = () => {
      released = true;
      setReady(true);
    };
    const deadline = setTimeout(release, UPDATE_WAIT_MS);

    applyUpdateIfReady(() => released).then((reloading) => {
      // While reloading, keep the gate shut so the old bundle never flashes.
      if (reloading) return;
      clearTimeout(deadline);
      release();
    });

    return () => clearTimeout(deadline);
  }, []);

  return ready;
}
