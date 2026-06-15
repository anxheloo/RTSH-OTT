import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { storeOnKeychain } from '@/services/keychain';

import { changePassword } from '../services/users';

/**
 * Change-password mutation. The endpoint ROTATES the refresh token (returns a
 * fresh pair), so on success we rewrite the keychain copy and swap the
 * in-memory access token — otherwise the next refresh would use a now-revoked
 * token and sign the user out. `user` is unchanged, so the store user stays put.
 */
export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: async ({ accessToken, refreshToken }) => {
      await storeOnKeychain(REFRESH_TOKEN_KEY, refreshToken);
      useAppStore.getState().updateUserSlice({ token: accessToken });
    },
  });
}