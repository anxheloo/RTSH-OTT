/**
 * Refresh-token vault — the single place that decides WHERE the refresh token
 * lives. "Remember me" is the only input:
 *
 *   remember = true  → keychain (survives app restarts — the app's default,
 *                      pre-"remember me" behavior)
 *   remember = false → in-memory only (lives for the JS context's lifetime, so
 *                      closing the app loses it → next launch starts fresh)
 *
 * Every refresh-token read/write goes through here, so the boot check, the 401
 * refresh, logout, and change-password rotation stay agnostic to the choice.
 *
 * `getRefreshToken()` reads memory FIRST, then keychain:
 *   • a non-remembered session still refreshes its access token while the app
 *     is open (memory hit),
 *   • a cold boot has empty memory, so it only finds a token if it was
 *     persisted — which is exactly "fresh start" for the non-remembered case.
 */
import { REFRESH_TOKEN_KEY } from '@/config/auth';

import { getFromKeychain, removeFromKeychain, storeOnKeychain } from './keychain';

/** Lives for the JS context's lifetime — gone on app close, by design. */
let sessionRefreshToken: string | null = null;
/** The active session's choice, so a mid-session rotation re-persists the same way. */
let remembered = true;

/** Persist a freshly issued refresh token according to the "remember me" choice. */
export async function setRefreshToken(
  token: string,
  options: { remember: boolean },
): Promise<void> {
  remembered = options.remember;
  sessionRefreshToken = token;
  if (options.remember) {
    await storeOnKeychain(REFRESH_TOKEN_KEY, token);
  } else {
    // A token left over from a previous "remembered" session would silently
    // resurrect the login on next boot — clear it.
    await removeFromKeychain(REFRESH_TOKEN_KEY);
  }
}

/** The active refresh token, memory-first then keychain. `null` if signed out. */
export async function getRefreshToken(): Promise<string | null> {
  if (sessionRefreshToken) return sessionRefreshToken;

  const persisted = await getFromKeychain(REFRESH_TOKEN_KEY);
  if (persisted) {
    // Hydrate memory + reflect that this is a remembered session (boot path),
    // so a later rotation keeps persisting to the keychain.
    sessionRefreshToken = persisted;
    remembered = true;
  }
  return persisted;
}

/** Re-persist a rotated refresh token using the active session's choice (change-password). */
export async function rotateRefreshToken(token: string): Promise<void> {
  await setRefreshToken(token, { remember: remembered });
}

/** Clear both stores — the local half of logout / account deletion. */
export async function clearRefreshToken(): Promise<void> {
  sessionRefreshToken = null;
  remembered = true; // reset to the default for the next session
  await removeFromKeychain(REFRESH_TOKEN_KEY);
}
