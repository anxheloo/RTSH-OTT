import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

export type Locale = 'sq' | 'en';

export interface SettingsSlice {
  locale: Locale;

  // Playback preferences (spec-mandated)
  cellularPlaybackAllowed: boolean;
  autoplayEnabled: boolean;
  dataSaverEnabled: boolean;
  hapticsEnabled: boolean;
  /** Telemetry opt-out (spec MW.14 / Mon.6). When false, `track()` is a no-op. */
  analyticsEnabled: boolean;

  // Universal batch setter (for composed multi-field updates)
  updateSettingsSlice: (state: Partial<SettingsSlice>) => void;

  setLocale: (locale: Locale) => void;
  setCellularPlaybackAllowed: (v: boolean) => void;
  setAutoplayEnabled: (v: boolean) => void;
  setDataSaverEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setAnalyticsEnabled: (v: boolean) => void;
}

export const createSettingsSlice: StateCreator<AppStore, [], [], SettingsSlice> = (set) => ({
  locale: 'sq',

  cellularPlaybackAllowed: false,
  autoplayEnabled: true,
  dataSaverEnabled: false,
  hapticsEnabled: true,
  analyticsEnabled: true,

  updateSettingsSlice: (state) => set(state),
  setLocale: (locale) => set({ locale }),
  setCellularPlaybackAllowed: (cellularPlaybackAllowed) => set({ cellularPlaybackAllowed }),
  setAutoplayEnabled: (autoplayEnabled) => set({ autoplayEnabled }),
  setDataSaverEnabled: (dataSaverEnabled) => set({ dataSaverEnabled }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
  setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
});
