import { StateCreator } from 'zustand';

import type { QualityId } from '@/types/domain';

import type { AppStore } from './useAppStore';

export type Locale = 'sq' | 'en';

export interface SettingsSlice {
  locale: Locale;
  tcAcceptedAt: number | null;

  // Playback preferences (spec-mandated)
  cellularPlaybackAllowed: boolean;
  backgroundVideoAllowed: boolean;
  autoplayEnabled: boolean;
  dataSaverEnabled: boolean;
  hapticsEnabled: boolean;
  /** Default ABR quality tier — applied when opening the player (store; active quality lives in PlayerSlice). */
  defaultQuality: QualityId;

  // App preferences
  /** Whether push / in-app notifications are enabled (stub — no native wiring in v1). */
  notificationsEnabled: boolean;

  // Universal batch setter (for composed multi-field updates)
  updateSettingsSlice: (state: Partial<SettingsSlice>) => void;

  setLocale: (locale: Locale) => void;
  acceptTC: () => void;
  setCellularPlaybackAllowed: (v: boolean) => void;
  setBackgroundVideoAllowed: (v: boolean) => void;
  setAutoplayEnabled: (v: boolean) => void;
  setDataSaverEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setDefaultQuality: (quality: QualityId) => void;
  setNotificationsEnabled: (v: boolean) => void;
}

export const createSettingsSlice: StateCreator<AppStore, [], [], SettingsSlice> = (set) => ({
  locale: 'sq',
  tcAcceptedAt: null,

  cellularPlaybackAllowed: false,
  backgroundVideoAllowed: true,
  autoplayEnabled: true,
  dataSaverEnabled: false,
  hapticsEnabled: true,
  defaultQuality: 'auto',
  notificationsEnabled: true,

  updateSettingsSlice: (state) => set(state),
  setLocale: (locale) => set({ locale }),
  acceptTC: () => set({ tcAcceptedAt: Date.now() }),
  setCellularPlaybackAllowed: (cellularPlaybackAllowed) => set({ cellularPlaybackAllowed }),
  setBackgroundVideoAllowed: (backgroundVideoAllowed) => set({ backgroundVideoAllowed }),
  setAutoplayEnabled: (autoplayEnabled) => set({ autoplayEnabled }),
  setDataSaverEnabled: (dataSaverEnabled) => set({ dataSaverEnabled }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
  setDefaultQuality: (defaultQuality) => set({ defaultQuality }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
});
