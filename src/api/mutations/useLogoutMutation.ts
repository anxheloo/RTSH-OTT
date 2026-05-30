import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { REFRESH_TOKEN_KEY } from '@/config/auth';
import { removeFromKeychain } from '@/services/keychain';

import { queryClient } from '../client';
import * as authService from '../services/auth';

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      try {
        await authService.logout();
      } catch {
        // Server logout best-effort; client cleanup must still proceed.
      }
    },
    onSettled: async () => {
      await removeFromKeychain(REFRESH_TOKEN_KEY);
      useAppStore.getState().logout();
      queryClient.clear();
    },
  });
}
