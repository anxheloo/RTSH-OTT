import { useCallback, useEffect, useRef } from 'react';
import { Appearance } from 'react-native';

import { resolveColors } from '@/store/createThemeSlice';
import { useAppStore } from '@/store/useAppStore';
import { queryClient } from '@/api/client';
import { refreshAccessToken, setupAuthRefresh } from '@/api/mutations/authRefresh';
import { initI18n } from '@/i18n';

import { useAppState } from './useAppState';
import { useCheckToken } from './useCheckToken';
import { useNetworkMonitor } from './useNetworkMonitor';
import { useOTA } from './useOTA';

export interface BootstrapState {
  /** True once the keychain check has resolved. Splash gate uses this. */
  isReady: boolean;
  isAuthenticated: boolean;
  ota: ReturnType<typeof useOTA>;
}

/**
 * App-root orchestrator. Mount exactly once from `_layout.tsx`. Responsibilities:
 *
 *   1. Wire 401 → refresh into the api client (`setupAuthRefresh`).
 *   2. Mount `useNetworkMonitor` (bridges NetInfo → TanStack `onlineManager`,
 *      mirrors connectivity into the store, drives the no-internet modal).
 *   3. Mount `useOTA` (exposes update state; runtime auto-checks on launch).
 *   4. Run boot auth check via `useCheckToken` (keychain-only — never blocks
 *      splash on the network).
 *   5. Kick off a background access-token refresh once the keychain check
 *      reports authenticated. Fire-and-forget so it never blocks first paint.
 *   6. Subscribe to OS color-scheme changes — re-resolves theme colors
 *      whenever `mode === 'system'` and the user toggles their OS theme at
 *      runtime.
 *
 * Splash gate (`isReady`) only blocks on (1) fonts (in `_layout.tsx`) and
 * (2) the keychain read — both essentially instant. The app boots offline.
 */
let bootstrapWired = false;
const wireOnceAtBoot = (): void => {
  if (bootstrapWired) return;
  bootstrapWired = true;
  setupAuthRefresh();
  initI18n();
};

export function useBootstrap(): BootstrapState {
  wireOnceAtBoot();

  useNetworkMonitor();
  const ota = useOTA();
  const auth = useCheckToken();

  const backgroundRefreshKicked = useRef(false);
  useEffect(() => {
    if (auth.data?.authenticated && !backgroundRefreshKicked.current) {
      backgroundRefreshKicked.current = true;
      void refreshAccessToken();
    }
  }, [auth.data?.authenticated]);

  // Invalidate live data on foreground so stale channels / EPG auto-refetch.
  // staleTime (5 min) naturally rate-limits how often a real network request fires.
  const handleForeground = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['channels'] });
    queryClient.invalidateQueries({ queryKey: ['epg'] });
  }, []);
  useAppState({ onForeground: handleForeground });

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (useAppStore.getState().mode === 'system') {
        useAppStore.setState({ colors: resolveColors('system') });
      }
    });
    return () => sub.remove();
  }, []);

  return {
    isReady: !auth.isLoading,
    isAuthenticated: auth.data?.authenticated ?? false,
    ota,
  };
}
