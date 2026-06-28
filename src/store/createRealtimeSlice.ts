import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

/**
 * Runtime real-time connection state, written by the STOMP client singleton
 * (`src/realtime/client.ts`). Not persisted — live connection state (mirrors
 * `NetworkSlice`). Mostly for debugging / a future "live" indicator; the channel
 * hook owns its own ad scheduler + geo state.
 */
export interface RealtimeSlice {
  realtimeConnected: boolean;
  updateRealtimeSlice: (data: Partial<RealtimeSlice>) => void;
}

export const createRealtimeSlice: StateCreator<AppStore, [], [], RealtimeSlice> = (set) => ({
  realtimeConnected: false,
  updateRealtimeSlice: (data) => set(data as Partial<AppStore>),
});
