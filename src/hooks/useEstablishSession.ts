import { useCallback, useEffect, useState } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { GUEST_MODE_ENABLED } from '@/constants/auth';
import { getGuestDeviceKey, mintGuestSession } from '@/features/auth/guestSession';
import { getRefreshToken } from '@/lib/tokenVault';

/**
 * Decides, once at boot, what kind of session this launch has. Five outcomes:
 *
 *   1. keychain holds a refresh token       → member. NO network (offline-first).
 *   2. not iOS                              → nothing; guest mode is iOS-only.
 *   3. a persisted guest token              → guest. NO network either.
 *   4. no token, but guest already chosen   → mint one (rare: the token was lost).
 *   5. nothing, or the mint failed          → the auth stack renders.
 *
 * **Only (4) touches the network, and it is the uncommon path** — the guest token
 * is persisted and long-lived, so a returning guest boots exactly as offline-first
 * as a member. That is deliberate: minting on every launch would put a
 * rate-limited call (60/min per IP, and carrier NAT concentrates a whole city
 * behind one address) on the app-open path, where a `429` would bounce a guest to
 * the entry screen for no reason of their own.
 *
 * Branch (2) gates the whole guest section, so on Android — phone, tablet, TV and
 * STB alike — this hook does exactly what it always did: one keychain read, then
 * member or auth stack. No extra read, no extra failure surface.
 *
 * The access token is not hydrated for a member here: on a cold boot it is null,
 * so the first authed request 401s and the interceptor refreshes. A guest's IS
 * hydrated (from the persisted copy), and a lapsed one simply 401s into a re-mint
 * — so an expired token costs one retried request, never a boot hang.
 */
export function useEstablishSession() {
  const [checked, setChecked] = useState(false);

  const establish = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        useAppStore.setState({ isAuthenticated: true });
        return;
      }

      if (!GUEST_MODE_ENABLED) return;

      // Both are MMKV-persisted and MMKV is synchronous, so they are already
      // hydrated here — this costs no await and adds no throw surface.
      const { guestToken, guestChosen } = useAppStore.getState();

      if (guestToken) {
        useAppStore.getState().setGuestSession(guestToken, await getGuestDeviceKey());
        return;
      }

      if (!guestChosen) return;

      const { accessToken, deviceKey } = await mintGuestSession();
      useAppStore.getState().setGuestSession(accessToken, deviceKey);
    } catch {
      // Three failure modes, all non-fatal and all landing on the auth stack:
      //
      //  • The first-ever expo-secure-store read on a fresh install can throw
      //    while Android Keystore initializes (races first-run dexopt on release
      //    builds). Swallow → treat as "no session"; the 401 interceptor
      //    recovers a real one.
      //  • The guest mint can fail permanently (`403 auth.guest_disabled` — the
      //    backend kill switch). Degrades to the login screen, which is exactly
      //    the pre-guest behavior.
      //  • Or transiently, after `mintGuestSession` has already retried. The
      //    entry screen it lands on carries its own "continue without an
      //    account" button, so the user retries with one tap.
      //
      // Without this, `checked` never flips and the splash hangs forever (it
      // only hides on fontsSettled && tokenChecked).
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    establish();
  }, [establish]);

  return { tokenChecked: checked };
}
