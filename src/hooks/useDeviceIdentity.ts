/**
 * Device identity wiring, mounted once in the authenticated app layout
 * (`(app)/_layout.tsx`) — so by definition the user is already authenticated;
 * no `isAuthenticated` guard needed. Removing that mount disables the feature.
 *
 * On app entry it does two things, in order:
 *   1. Stamps the static `X-Device-Id` / `X-Device-Platform` / `X-App-Version`
 *      headers onto `apiClient` defaults so they ride every request (ABR ladder
 *      at `/streams`, 426 version gate). The per-request pair (`Authorization`,
 *      `Accept-Language`) stays in the request interceptor — it changes at
 *      runtime; identity can't.
 *   2. Fires device registration (`PUT /users/me/device`). Fire-and-forget; the
 *      backend upserts on `(userId, deviceKey)`, so re-sends every app open are
 *      harmless and version bumps (app/OS update) refresh the registry.
 *
 * Headers are stamped before the registration POST so it carries them.
 */
import { useEffect } from 'react';

import { apiClient } from '@/api/client';
import { registerDevice } from '@/api/services/devices';
import { buildDeviceHeaders, buildDeviceRegistration } from '@/utils/device';

export function useDeviceIdentity(): void {
  useEffect(() => {
    void (async () => {
      const headers = await buildDeviceHeaders();
      for (const [key, value] of Object.entries(headers)) {
        apiClient.defaults.headers.common[key] = value;
      }
      try {
        await registerDevice(await buildDeviceRegistration());
      } catch {
        // Registration is metadata, never auth — a failed upsert must not
        // surface to the user; the next app open retries.
      }
    })();
  }, []);
}
