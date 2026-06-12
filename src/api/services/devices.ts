/**
 * Device registry. The backend keeps a per-account device list ("manage my
 * devices", analytics — no device cap, confirmed 2026-06-12); the client
 * upserts its own entry whenever auth becomes ready — see `useDeviceIdentity`.
 */
import type { DeviceRegistration } from '@/types/domain';

import { apiClient } from '../client';
import { USERS_ROUTES } from '../endpoints';

/**
 * Fire-and-forget upsert keyed on `(userId, deviceKey)` server-side. Callers
 * must not block UI on it — registration is metadata, never auth.
 * PUT with a bare `DeviceInfoDTO` body (no envelope), per the end-user spec.
 */
export async function registerDevice(payload: DeviceRegistration): Promise<void> {
  await apiClient.put(USERS_ROUTES.DEVICE, payload);
}
