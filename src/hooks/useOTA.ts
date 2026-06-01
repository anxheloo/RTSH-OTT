import * as Updates from 'expo-updates';

/**
 * Returns the live `expo-updates` state. The Expo runtime auto-checks for
 * updates on launch (per `checkAutomatically` config; defaults to ON_LOAD in
 * production), so no manual `checkForUpdateAsync` call is needed here —
 * doing both races two state machines.
 *
 * Caller decides when to apply (`Updates.reloadAsync()` on next foreground,
 * or prompt the user) using fields like `isUpdatePending`, `isUpdateAvailable`,
 * `isDownloading`.
 *
 * No-op in dev: `Updates.isEnabled === false` in dev clients, and the hook
 * just reports the inert state from the runtime.
 */
export function useOTA() {
  return Updates.useUpdates();
}
