import { useMutation } from '@tanstack/react-query';

import { buildDeviceRegistration } from '@/utils/device';

import { SILENT_ERROR } from '../client';
import { registerDevice } from '../services/devices';

/**
 * Device-registration mutation — fires the `PUT /users/me/device` upsert on app
 * entry (Home mount). Fire-and-forget: registration is metadata, never auth, so
 * `meta: SILENT_ERROR` suppresses the global error modal at any status and the
 * next app open retries. The backend upserts on `(userId, deviceKey)`, so
 * re-sends are harmless.
 */
async function registerDeviceFlow() {
  return registerDevice(await buildDeviceRegistration());
}

export function useRegisterDeviceMutation() {
  return useMutation({
    mutationFn: registerDeviceFlow,
    meta: SILENT_ERROR,
  });
}
