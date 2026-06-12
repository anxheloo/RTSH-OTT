/**
 * One-shot boot wiring for device identity: resolves the keychain device ID
 * and stamps the static `X-Device-Id` / `X-Device-Platform` / `X-App-Version`
 * headers onto `apiClient` defaults. Mounted once from `useBootstrap`, next to
 * `useNetworkMonitor` — removing that single mount disables the feature.
 *
 * Static headers only. The per-request pair (`Authorization`,
 * `Accept-Language`) stays in the request interceptor because it can change
 * at runtime; identity can't.
 *
 * Also owns device registration (`PUT /users/me/device`): fired whenever
 * `isAuthenticated` flips true — login, register completion, or a cold boot
 * with an existing session. Fire-and-forget; the backend upserts on
 * `(userId, deviceKey)`, so re-sends are harmless and version bumps
 * (app/OS update) refresh the registry on the next boot.
 */
import { useEffect } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { apiClient } from '@/api/client';
import { registerDevice } from '@/api/services/devices';
import { buildDeviceHeaders, buildDeviceRegistration } from '@/utils/device';

export function useDeviceIdentity(): void {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  useEffect(() => {
    void (async () => {
      const headers = await buildDeviceHeaders();
      for (const [key, value] of Object.entries(headers)) {
        apiClient.defaults.headers.common[key] = value;
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      try {
        await registerDevice(await buildDeviceRegistration());
      } catch {
        // Registration is metadata, never auth — a failed upsert must not
        // surface to the user; the next auth-ready transition retries.
      }
    })();
  }, [isAuthenticated]);
}
