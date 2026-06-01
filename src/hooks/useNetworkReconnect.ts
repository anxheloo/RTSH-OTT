import { useSyncExternalStore } from 'react';

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

export interface NetworkState {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoState['type'];
}

const deriveOnline = (s: NetInfoState): boolean =>
  Boolean(s.isConnected && (s.isInternetReachable ?? true));

/**
 * Module-level network state. A single NetInfo listener fans out to:
 *   - the TanStack `onlineManager` (so queries pause offline + refetch on reconnect)
 *   - any React component subscribed via `useNetworkReconnect`
 *
 * Initialized lazily on first subscriber so unit imports don't cost anything.
 */
let cached: NetworkState = {
  isOnline: false,
  isInternetReachable: null,
  type: NetInfoStateType.unknown,
};
const subscribers = new Set<() => void>();

const update = (s: NetInfoState) => {
  const next: NetworkState = {
    isOnline: deriveOnline(s),
    isInternetReachable: s.isInternetReachable,
    type: s.type,
  };
  if (
    next.isOnline === cached.isOnline &&
    next.isInternetReachable === cached.isInternetReachable &&
    next.type === cached.type
  ) {
    return;
  }
  cached = next;
  subscribers.forEach((fn) => fn());
};

let initialized = false;
const initialize = (): void => {
  if (initialized) return;
  initialized = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((s) => setOnline(deriveOnline(s))),
  );

  NetInfo.addEventListener(update);
  NetInfo.fetch().then(update);
};

const subscribe = (cb: () => void): (() => void) => {
  initialize();
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
};

const getSnapshot = (): NetworkState => cached;

/**
 * Returns the current network state. Safe to mount from many components — all
 * share a single underlying NetInfo subscription. Bridges NetInfo into
 * TanStack `onlineManager` on first call.
 */
export function useNetworkReconnect(): NetworkState {
  return useSyncExternalStore(subscribe, getSnapshot);
}
