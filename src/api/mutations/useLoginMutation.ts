import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { storeOnKeychain } from '@/services/keychain';

import { INLINE_CLIENT_ERROR } from '../client';
import * as authService from '../services/auth';

export function useLoginMutation() {
  return useMutation({
    mutationFn: authService.login,
    meta: INLINE_CLIENT_ERROR, // 4xx inline on the form; 5xx/network → modal

    onSuccess: async ({ user, accessToken, refreshToken }) => {
      await storeOnKeychain(REFRESH_TOKEN_KEY, refreshToken);
      useAppStore.getState().login(user, accessToken);
    },
  });
}
