import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';

import { setParentalPin, updateParental } from '../services/users';

/**
 * Parental writes, modelled like every other mutation in the app: the hook owns
 * the network call AND the resulting store update (`onSuccess`), so components
 * stay dumb and get `isPending`/`error` for free. The user-object merge lives in
 * `setParentalConfig` (single source of truth). See `rules/ARCHITECTURE.md →
 * Parental control`.
 */

/** First-time setup: `POST /parental { enabled: true, pin }`, then mirror locally. */
export function useSetupParentalMutation() {
  return useMutation({
    mutationFn: setParentalPin,
    onSuccess: (_data, pin) => {
      useAppStore.getState().setParentalConfig({ enabled: true, pin });
    },
  });
}

/** Enable/disable toggle (and later change-PIN): `PATCH /parental`, then mirror locally. */
export function useUpdateParentalMutation() {
  return useMutation({
    mutationFn: updateParental,
    onSuccess: (_data, payload) => {
      useAppStore
        .getState()
        .setParentalConfig(payload.newPin ? { enabled: payload.enabled, pin: payload.newPin } : { enabled: payload.enabled });
    },
  });
}
