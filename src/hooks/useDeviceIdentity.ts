/**
 * Device registration wiring, mounted on the Home screen — so by the time it
 * runs the user is authenticated and has reached the app. Removing that mount
 * disables the feature.
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
