import { NetInfoStateType } from '@react-native-community/netinfo';
import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

/**
 * Runtime connectivity state, written by `useNetworkMonitor` (mounted once at
 * root). Not persisted — it's live device state. Components read `isOnline`
 * directly (`useAppStore((s) => s.isOnline)`); the cellular gate reads
 * `connectionType`.
 *
 * `cellularAcknowledged` is the session-only "user tapped Continue over
 * cellular" flag — set by `useCellularGate` so the data-warning isn't
 * re-prompted on every player remount/channel switch, and reset by
 * `useNetworkMonitor` whenever the connection leaves cellular (so a later
 * WiFi → cellular transition re-asks). Not persisted: a fresh launch re-asks;
 * the durable "always allow" lives in `SettingsSlice.cellularPlaybackAllowed`.
 */
export interface NetworkSlice {
  isOnline: boolean;
  connectionType: NetInfoStateType;
  cellularAcknowledged: boolean;
  updateNetworkSlice: (data: Partial<NetworkSlice>) => void;
}

export const createNetworkSlice: StateCreator<AppStore, [], [], NetworkSlice> = (set) => ({
  // Optimistic until NetInfo reports — avoids a false "offline" flash on boot.
  isOnline: true,
  connectionType: NetInfoStateType.unknown,
  cellularAcknowledged: false,
  updateNetworkSlice: (data) => set(data as Partial<AppStore>),
});
