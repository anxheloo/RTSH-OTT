/**
 * Device registration wiring, mounted in the authenticated `(app)/_layout` — so
 * it runs once per authenticated entry regardless of which route the user lands
 * on (covers deep links into a non-Home tab). Removing that mount disables the
 * feature.
 *
 * Fires the device registration upsert (`PUT /users/me/device`) once on mount
 * via `useRegisterDeviceMutation`. Fire-and-forget; the backend upserts on
 * `(userId, deviceKey)`, so re-sends are harmless and version bumps refresh the
 * registry. `mutate` is referentially stable, so the effect runs exactly once.
 */
import { useEffect } from 'react';

import { useRegisterDeviceMutation } from '@/api/mutations';

export function useDeviceIdentity(): void {
  const { mutate } = useRegisterDeviceMutation();

  useEffect(() => {
    mutate();
  }, [mutate]);
}
