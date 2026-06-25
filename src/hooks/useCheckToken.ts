import { useCallback, useEffect, useState } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { getFromKeychain } from '@/services/keychain';

export function useCheckToken() {
  const [checked, setChecked] = useState(false);

  const checkRefreshToken = useCallback(async () => {
    // TODO(anx 2026-06-25): TEMP boot diagnostics — remove after first-launch splash hang is found.
    console.log('[BOOT] useCheckToken: reading keychain…');
    try {
      const refreshToken = await getFromKeychain(REFRESH_TOKEN_KEY);
      console.log('[BOOT] useCheckToken: keychain returned', refreshToken ? 'a token' : 'null');
      if (refreshToken) {
        useAppStore.setState({ isAuthenticated: true });
      }
    } catch (e) {
      // The first-ever expo-secure-store read on a fresh install can throw while
      // Android Keystore initializes (races first-run dexopt on release builds).
      // Swallow → treat as "no session"; the 401 interceptor recovers a real one.
      // Without this, `checked` never flips and the splash hangs forever (it only
      // hides on fontsLoaded && tokenChecked).
      console.log('[BOOT] useCheckToken: keychain THREW', e);
    } finally {
      console.log('[BOOT] useCheckToken: finally → setChecked(true)');
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    checkRefreshToken();
  }, [checkRefreshToken]);

  return { tokenChecked: checked };
}
