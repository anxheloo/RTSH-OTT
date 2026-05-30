import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { storeOnKeychain } from '@/services/keychain';

import * as authService from '../services/auth';

export function useLoginMutation() {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: async ({ user, accessToken, refreshToken }) => {
      await storeOnKeychain(REFRESH_TOKEN_KEY, refreshToken);
      useAppStore.getState().login(user, accessToken);
    },
  });
}
