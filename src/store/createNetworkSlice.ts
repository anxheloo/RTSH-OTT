import { NetInfoStateType } from '@react-native-community/netinfo';
import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

/**
 * Runtime connectivity state, written by `useNetworkMonitor` (mounted once at
 * root). Not persisted — it's live device state. Components read `isOnline`
 * directly (`useAppStore((s) => s.isOnline)`); the cellular gate reads
 * `connectionType`.
 */
export interface NetworkSlice {
  isOnline: boolean;
  connectionType: NetInfoStateType;
  updateNetworkSlice: (data: Partial<NetworkSlice>) => void;
}

export const createNetworkSlice: StateCreator<AppStore, [], [], NetworkSlice> = (set) => ({
  // Optimistic until NetInfo reports — avoids a false "offline" flash on boot.
  isOnline: true,
  connectionType: NetInfoStateType.unknown,
  updateNetworkSlice: (data) => set(data as Partial<AppStore>),
});
