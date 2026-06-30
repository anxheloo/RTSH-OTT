import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { rotateRefreshToken } from '@/services/tokenVault';

import { INLINE_CLIENT_ERROR } from '../client';
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
    meta: INLINE_CLIENT_ERROR, // 4xx inline on the form; 5xx/network → modal
    onSuccess: async ({ accessToken, refreshToken }) => {
      // Re-persist using the session's "remember me" choice (keychain or memory).
      await rotateRefreshToken(refreshToken);
      useAppStore.getState().updateUserSlice({ token: accessToken });
    },
  });
}