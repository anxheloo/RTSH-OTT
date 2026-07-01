import { useCallback, useEffect, useState } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { getRefreshToken } from '@/lib/tokenVault';

export function useCheckToken() {
  const [checked, setChecked] = useState(false);

  const checkRefreshToken = useCallback(async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        useAppStore.setState({ isAuthenticated: true });
      }
    } catch {
      // The first-ever expo-secure-store read on a fresh install can throw while
      // Android Keystore initializes (races first-run dexopt on release builds).
      // Swallow → treat as "no session"; the 401 interceptor recovers a real one.
      // Without this, `checked` never flips and the splash hangs forever (it only
      // hides on fontsLoaded && tokenChecked).
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    checkRefreshToken();
  }, [checkRefreshToken]);

  return { tokenChecked: checked };
}
