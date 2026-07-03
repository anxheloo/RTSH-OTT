import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

/**
 * App-wide ad exclusivity — mirrors `ModalSlice`'s single-active-modal
 * invariant (one disruptive full-screen overlay at a time). `activeAdId` is
 * claimed/released by `useAdSlot` (`hooks/useAdSlot.ts`), not written to
 * directly by screens. Runtime only, not persisted — an ad mid-flight has no
 * meaning across app restarts.
 */
export interface AdsSlice {
  activeAdId: number | null;
  updateAdsSlice: (data: Partial<AdsSlice>) => void;
}

export const createAdsSlice: StateCreator<AppStore, [], [], AdsSlice> = (set) => ({
  activeAdId: null,
  updateAdsSlice: (data) => set(data as Partial<AppStore>),
});
