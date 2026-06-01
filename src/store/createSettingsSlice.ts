import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

export type Locale = 'sq' | 'en';

export interface SettingsSlice {
  locale: Locale;
  tcAcceptedAt: number | null;

  // Playback preferences (spec-mandated; UI lands in later phases)
  cellularPlaybackAllowed: boolean;
  backgroundVideoAllowed: boolean;
  autoplayEnabled: boolean;
  dataSaverEnabled: boolean;
  hapticsEnabled: boolean;

  setLocale: (locale: Locale) => void;
  acceptTC: () => void;
  setCellularPlaybackAllowed: (v: boolean) => void;
  setBackgroundVideoAllowed: (v: boolean) => void;
  setAutoplayEnabled: (v: boolean) => void;
  setDataSaverEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
}

export const createSettingsSlice: StateCreator<AppStore, [], [], SettingsSlice> = (set) => ({
  locale: 'sq',
  tcAcceptedAt: null,

  cellularPlaybackAllowed: false,
  backgroundVideoAllowed: true,
  autoplayEnabled: true,
  dataSaverEnabled: false,
  hapticsEnabled: true,

  setLocale: (locale) => set({ locale }),
  acceptTC: () => set({ tcAcceptedAt: Date.now() }),
  setCellularPlaybackAllowed: (cellularPlaybackAllowed) => set({ cellularPlaybackAllowed }),
  setBackgroundVideoAllowed: (backgroundVideoAllowed) => set({ backgroundVideoAllowed }),
  setAutoplayEnabled: (autoplayEnabled) => set({ autoplayEnabled }),
  setDataSaverEnabled: (dataSaverEnabled) => set({ dataSaverEnabled }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
});
