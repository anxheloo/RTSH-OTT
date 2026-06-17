import { useEffect } from 'react';

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';

/** Online = has a connection AND the internet is reachable (captive-portal safe). */
const deriveOnline = (s: NetInfoState): boolean =>
  Boolean(s.isConnected && (s.isInternetReachable ?? true));

/**
 * Single NetInfo listener for the whole app. Mount ONCE at root (in
 * `RootLayoutNav`, `_layout.tsx`). It:
 *   - bridges NetInfo into TanStack `onlineManager` (queries pause offline,
 *     refetch on reconnect),
 *   - mirrors connectivity into the store (`isOnline` / `connectionType`) so any
 *     component reads it with `useAppStore((s) => s.isOnline)`,
 *   - opens the `noInternet` modal on disconnect and closes it on reconnect.
 *
 * Mirrors RTSH's `useNetworkMonitor` (trigger-from-listener); the modal owns its
 * copy via i18n, so no text is passed here.
 */
export function useNetworkMonitor(): void {
  useEffect(() => {
    const apply = (s: NetInfoState) => {
      const online = deriveOnline(s);
      const store = useAppStore.getState();

      store.updateNetworkSlice({ isOnline: online, connectionType: s.type });

      if (!online) {
        if (store.currentModal !== 'noInternet') {
          store.updateModalSlice({ currentModal: 'noInternet', modalData: {} });
        }
      } else if (store.currentModal === 'noInternet') {
        store.updateModalSlice({ currentModal: null });
      }
    };

    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((s) => {
        setOnline(deriveOnline(s));
        apply(s);
      }),
    );

    NetInfo.fetch().then(apply);
  }, []);
}
