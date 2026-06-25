/**
 * Permanently delete the authenticated account (`DELETE /users/me`).
 *
 * Unlike logout, this is NOT best-effort: the local session is wiped ONLY on a
 * confirmed 200 (`onSuccess`, not `onSettled`) — if the server delete fails the
 * user stays signed in and the failure surfaces via the global `apiError` modal
 * (no `SILENT_ERROR`/`INLINE_CLIENT_ERROR` meta). The local wipe mirrors logout:
 * `store.logout()` removes the keychain refresh token + clears auth state, so the
 * root guard routes to `(auth)`. Unlike logout, deletion ALSO clears the
 * device-level parental gate (`clearParentalConfig`) — the device's account data
 * is being erased, so the PIN goes with it.
 */
import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';

import { queryClient } from '../client';
import { deleteAccount } from '../services/users';

export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      const { logout, clearParentalConfig } = useAppStore.getState();
      await logout();
      clearParentalConfig();
      queryClient.clear();
    },
  });
}
