import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { setRefreshToken } from '@/lib/tokenVault';

import { INLINE_CLIENT_ERROR } from '../client';
import type { LoginPayload } from '../services/auth';
import * as authService from '../services/auth';

/** Credentials + the "remember me" choice (decides where the refresh token lives). */
export interface LoginVariables extends LoginPayload {
  rememberMe: boolean;
}

export function useLoginMutation() {
  return useMutation({
    // `rememberMe` is a client persistence choice, not part of the login request.
    mutationFn: ({ rememberMe: _rememberMe, ...credentials }: LoginVariables) =>
      authService.login(credentials),
    meta: INLINE_CLIENT_ERROR, // 4xx inline on the form; 5xx/network → modal

    onSuccess: async ({ user, accessToken, refreshToken }, { rememberMe }) => {
      await setRefreshToken(refreshToken, { remember: rememberMe });
      useAppStore.getState().login(user, accessToken);
    },
  });
}
