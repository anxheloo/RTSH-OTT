import { useCallback, useEffect, useState } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { getFromKeychain } from '@/services/keychain';

export function useCheckToken() {
  const [checked, setChecked] = useState(false);

  const checkRefreshToken = useCallback(async () => {
    const refreshToken = await getFromKeychain(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      useAppStore.setState({ isAuthenticated: true });
    }
    setChecked(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkRefreshToken();
  }, [checkRefreshToken]);

  return { tokenChecked: checked };
}
