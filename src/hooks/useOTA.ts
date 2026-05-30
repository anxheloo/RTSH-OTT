import { useEffect } from 'react';

import * as Updates from 'expo-updates';

/**
 * On app launch, check for an OTA update and download it if available. Returns
 * the live `useUpdates()` state so the caller can decide when to apply
 * (e.g. `Updates.reloadAsync()` on next foreground, or prompt the user).
 *
 * No-op in dev (`Updates.isEnabled === false` in dev clients). Errors are
 * swallowed — an OTA check failure must never block app boot.
 */
export function useOTA() {
  const state = Updates.useUpdates();

  useEffect(() => {
    if (!Updates.isEnabled) return;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch {
        // Silent — OTA failures must not affect runtime.
      }
    })();
  }, []);

  return state;
}
