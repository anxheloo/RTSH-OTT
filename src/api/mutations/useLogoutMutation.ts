import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { useAppStore } from '@/store/useAppStore';

import { queryClient } from '../client';
import * as authService from '../services/auth';

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      try {
        await authService.logout();
      } catch (e) {
        // Best-effort server logout. Swallow auth errors (session already
        // dead); log unexpected failures in dev so they aren't invisible.
        if (__DEV__ && !(e instanceof AxiosError && (e.response?.status === 401 || e.response?.status === 403))) {
          // eslint-disable-next-line no-console
          console.warn('[logout] server call failed:', e);
        }
      }
    },
    onSettled: async () => {
      await useAppStore.getState().logout();
      queryClient.clear();
    },
  });
}
