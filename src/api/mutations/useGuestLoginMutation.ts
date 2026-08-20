import { useMutation } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';
import { mintGuestSession } from '@/features/auth/guestSession';

/**
 * "Continue without an account" — mints a device-scoped session with no identity.
 *
 * Sends the SAME device object as login, so the token carries the same `did`/`dc`
 * claims and everything downstream is byte-identical to a member session.
 *
 * Two writes on success, and both matter:
 *   • `setGuestSession` — the runtime session (memory only, never persisted).
 *   • `setGuestChosen(true)` — the persisted CHOICE. The token itself is
 *     persisted by `setGuestSession`, so the next launch rehydrates it with no
 *     network; this flag is the durable INTENT that re-mints if the token is
 *     ever lost, and it is what stops the welcome gate asking again.
 *
 * Errors are deliberately NOT suppressed: this is a button the user pressed, so a
 * failure must surface. The global `apiError` modal owns it (no `meta`), and the
 * user is left on the login screen — which is a working fallback, not a dead end.
 */
export function useGuestLoginMutation() {
  return useMutation({
    mutationFn: mintGuestSession,
    onSuccess: ({ accessToken, deviceKey }) => {
      const store = useAppStore.getState();
      store.setGuestSession(accessToken, deviceKey);
      store.setGuestChosen(true);
    },
  });
}
